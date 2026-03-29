import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import validator from '@app/server/middlewares/validator';
import {
  controller,
  httpPost,
  response,
  request,
  requestBody,
  queryParam
} from 'inversify-express-utils';
import {
  changeStudentPassword,
  forgotStudentPassword,
  ResetPasswordValidator,
  studentLogin,
  studentSignup
} from './student.validator';
import {
  ChangeStudentPasswordDTO,
  ForgotStudentPasswordDTO,
  ResetPasswordDTO,
  StudentLoginDTO,
  StudentSignupDTO
} from './student.dto';
import studentRepo from '@app/data/student/student.repo';
import jwt from 'jsonwebtoken';
import env from '@app/common/config/env';
import authVerify from '@app/server/middlewares/auth.verify';
import thesisRepo from '@app/data/thesis/thesis.repo';
import {
  ActionNotAllowedError,
  BadRequestError,
  ControllerError,
  NotFoundError
} from '../base';
import nodeMailerEmailService from '@app/server/services/email/email.nodemailer.service';
import { HashingService } from '@app/server/utils/hashing';
import { redis } from '@app/common/services/redis';
import {
  OTPRateLimiterService,
  PasswordRateLimiterService
} from '@app/server/services';

@controller('/auth/student')
export default class StudentAuthController extends BaseController {
  /**
   * signup student
   */
  @httpPost('/', validator(studentSignup))
  async studentSignUp(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: StudentSignupDTO
  ) {
    try {
      const findStudent = await studentRepo.model.findOne({
        email: body.email
      });

      if (findStudent) {
        throw new ControllerError('Student with email already exists');
      }
      const student = await studentRepo.create(body);

      let signedData: object = {
        id: student._id,
        email: student.email,
        department: student.department,
        faculty: student.faculty,
        type: 'student'
      };

      const token = jwt.sign(
        {
          data: signedData
        },
        env.jwt_secret,
        { expiresIn: env.expires_at }
      );

      nodeMailerEmailService.sendWelcomeEmail(
        student.email,
        student.first_name
      );
      this.handleSuccess(req, res, { ...signedData, token });
      console.log('Student signed up successfully after sending response');
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost('/login', validator(studentLogin))
  async studentLogin(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: StudentLoginDTO
  ) {
    try {
      const student = await studentRepo.model
        .findOne({ email: body.email })
        .select('+password')
        .exec();

      if (!student) {
        throw new ActionNotAllowedError('Invalid credentials');
      }
      const isPasswordValid = await student.isPasswordValid(body.password);

      if (!isPasswordValid) {
        await PasswordRateLimiterService.limit(student.id);
        throw new ControllerError('Invalid email or password');
      }

      let signedData: object = {
        id: student._id,
        email: student.email,
        department: student.department,
        faculty: student.faculty,
        type: 'student'
      };

      const token = jwt.sign(
        {
          data: signedData
        },
        env.jwt_secret,
        { expiresIn: env.expires_at }
      );

      // gets all thesis tied to a student
      const studentPlainDetails = student.toObject();
      delete studentPlainDetails.password;
      delete studentPlainDetails.__v;

      const paginatedThesis = await thesisRepo.list({
        conditions: { student_id: student._id },
        populate: ['student_id', 'lecturer_id', 'methodology_id'],
        return_total_pages: true,
        sort: { created_at: -1 },
        page: 1,
        per_page: 2
      });

      await PasswordRateLimiterService.reset(student.id);
      this.handleSuccess(req, res, {
        ...studentPlainDetails,
        paginatedThesis,
        token
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost('/change-password', authVerify, validator(changeStudentPassword))
  async changeStudentPassword(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ChangeStudentPasswordDTO
  ) {
    try {
      if (req.user_data.type !== 'student') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      if (body.old_password === body.new_password) {
        throw new BadRequestError(
          'New password must be different from old password'
        );
      }

      const student = await studentRepo.model.findById(
        req.user_data.id,
        '+password'
      );

      if (!student) {
        throw new NotFoundError('student not found');
      }

      const isPasswordValid = await student.isPasswordValid(body.old_password);

      if (!isPasswordValid) {
        await PasswordRateLimiterService.limit(student.id);
        throw new ControllerError('Invalid email or password');
      }

      await student.updatePassword(body.new_password);

      await PasswordRateLimiterService.reset(student.id);

      this.handleSuccess(req, res, {
        message: 'Password changed successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  /**
   * Handles the forgot password request for a student
   * @param req
   * @param res
   * @param body
   */
  @httpPost('/forgot-password', validator(forgotStudentPassword))
  async forgotStudentPassword(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ForgotStudentPasswordDTO
  ) {
    try {
      const student = await studentRepo.model.findOne({ email: body.email });

      if (!student) {
        await OTPRateLimiterService.limit(student.id);
        throw new NotFoundError('Student not found');
      }

      // do not use jwt to generate reset token generate random alphanumeric string strongly encrypt it and save in redis with an expirty time of 30 minutes and use the token to verify the reset password request
      const resetToken = HashingService.generateKey();
      const hashToken = await HashingService.toHash(resetToken);

      // save the hashed token in redis with an expiry time of 30 minutes
      await redis.set(`password_reset_token:${student.id}`, resetToken, {
        EX: 1800
      });

      // console.log(
      //   'Password reset hash generated successfully hashToken',
      //   `http://localhost:${env.port}/api/v1/student/reset-password?token=${hashToken}`
      // );

      // Send the reset token to the student's email
      nodeMailerEmailService.sendPasswordResetEmail(
        student.email,
        student.first_name,
        `${env.api_url}/student/reset-password?token=${hashToken}`
      );
      // for use in cases where you want to limit after certain api calls as it's a public api
      await OTPRateLimiterService.limit(student.id);
      await OTPRateLimiterService.limit(req.ip);

      this.handleSuccess(req, res, {
        message: 'Password reset email sent successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost('/reset-password', validator(ResetPasswordValidator))
  async resetStudentPassword(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ResetPasswordDTO,
    @queryParam('token') token: string
  ) {
    try {
      const student = await studentRepo.model.findOne({ email: body.email });
      if (!student) {
        await OTPRateLimiterService.limit(student.id);
        throw new NotFoundError('Student not found');
      }

      let cachedToken = await redis.get(`password_reset_token:${student.id}`);
      if (!cachedToken) {
        await OTPRateLimiterService.limit(student.id);
        throw new ControllerError('Invalid or Expired password reset value');
      }

      const isResetTokenValid = await HashingService.compare(
        token, // hashed token
        cachedToken // token key
      );

      if (!isResetTokenValid) {
        await OTPRateLimiterService.limit(student.id);
        throw new ControllerError('Invalid password reset token');
      }

      // Update the student's password
      await student.updatePassword(body.password);

      // still limit it as this is a public endpoint and it help to reduce malicous users
      await OTPRateLimiterService.limit(req.ip);
      await OTPRateLimiterService.limit(student.id);
      await redis.del(`password_reset_token:${student.id}`);

      this.handleSuccess(req, res, {
        message: 'Password reset successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }
}
