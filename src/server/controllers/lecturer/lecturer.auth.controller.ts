import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import validator from '@app/server/middlewares/validator';
import {
  controller,
  httpPost,
  response,
  request,
  requestBody
  // queryParam
} from 'inversify-express-utils';
import {
  changeLecturerPassword,
  lecturerLogin,
  lecturerSignup
} from './lecturer.validator';
import {
  ChangeLecturerPasswordDTO,
  LecturerLoginDTO,
  LecturerSignupDTO
} from './lecturer.dto';
import lecturerRepo from '@app/data/lecturer/lecturer.repo';
import jwt from 'jsonwebtoken';
import env from '@app/common/config/env';
import {
  ActionNotAllowedError,
  BadRequestError,
  ControllerError,
  NotFoundError
} from '../base';
import authVerify from '@app/server/middlewares/auth.verify';
import thesisRepo from '@app/data/thesis/thesis.repo';
import emailNodemailerService from '@app/server/services/email/email.nodemailer.service';
import {
  forgotPasswordValidator,
  // ResetPasswordValidator,
  ResetPasswordValidatorV2
} from '../student/student.validator';
import {
  ForgotPasswordDTO,
  // ResetPasswordDTO,
  ResetPasswordDTOV2
} from '../student/student.dto';
import { redis } from '@app/common/services/redis';
import {
  OTPRateLimiterService,
  PasswordRateLimiterService
} from '@app/server/services';
// import { HashingService } from '@app/server/utils/hashing';

@controller('/auth/lecturer')
export default class LecturerAuthController extends BaseController {
  /**
   * signup lecturer
   */
  @httpPost('/', validator(lecturerSignup))
  async lecturerSignUp(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: LecturerSignupDTO
  ) {
    try {
      const findLecturer = await lecturerRepo.model.findOne({
        email: body.email
      });

      if (findLecturer) {
        throw new ControllerError('Lecturer with email already exists');
      }

      const lecturer = await lecturerRepo.create(body);

      let signedData: object = {
        id: lecturer._id,
        email: lecturer.email,
        department: lecturer.department,
        faculty: lecturer.faculty,
        type: 'lecturer'
      };

      const token = jwt.sign(
        {
          data: signedData
        },
        env.jwt_secret,
        { expiresIn: env.expires_at }
      );

      emailNodemailerService.sendWelcomeEmail(
        lecturer.email,
        lecturer.first_name
      );

      this.handleSuccess(req, res, { ...lecturer, token });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost('/login', validator(lecturerLogin))
  async lecturerLogin(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: LecturerLoginDTO
  ) {
    try {
      const lecturer = await lecturerRepo.model
        .findOne({ email: body.email })
        .select('+password')
        .exec();

      if (!lecturer) {
        throw new ActionNotAllowedError('Invalid credentials');
      }
      const isPasswordValid = await lecturer.isPasswordValid(body.password);

      if (!isPasswordValid) {
        await PasswordRateLimiterService.limit(lecturer.id);
        throw new ControllerError('Invalid email or password');
      }

      let signedData: object = {
        id: lecturer._id,
        email: lecturer.email,
        department: lecturer.department,
        faculty: lecturer.faculty,
        type: 'lecturer'
      };

      const token = jwt.sign(
        {
          data: signedData
        },
        env.jwt_secret,
        { expiresIn: env.expires_at }
      );

      // gets all thesis tied to a lecturer
      const lecturerPlainDetails = lecturer.toObject();
      delete lecturerPlainDetails.password;
      delete lecturerPlainDetails.__v;

      await PasswordRateLimiterService.reset(lecturer.id);

      const paginatedThesis = await thesisRepo.list({
        conditions: { lecturer_id: lecturer._id },
        populate: ['student_id', 'lecturer_id', 'methodology_id'],
        return_total_pages: true,
        sort: { created_at: -1 },
        page: 1,
        per_page: 2
      });

      this.handleSuccess(req, res, {
        ...lecturerPlainDetails,
        paginatedThesis,
        token
      });
    } catch (err) {
      console.error('<<>> lecturer login error', err);
      this.handleError(req, res, err);
    }
  }

  @httpPost('/change-password', authVerify, validator(changeLecturerPassword))
  async changeLecturerPassword(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ChangeLecturerPasswordDTO
  ) {
    try {
      if (req.user_data.type !== 'lecturer') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      if (body.old_password === body.new_password) {
        throw new BadRequestError(
          'New password must be different from old password'
        );
      }

      const lecturer = await lecturerRepo.model.findById(
        req.user_data.id,
        '+password'
      );

      if (!lecturer) {
        throw new NotFoundError('lecturer not found');
      }

      const isPasswordValid = await lecturer.isPasswordValid(body.old_password);

      if (!isPasswordValid) {
        await PasswordRateLimiterService.limit(lecturer.id);
        throw new ControllerError('Invalid email or password');
      }

      await lecturer.updatePassword(body.new_password);

      await PasswordRateLimiterService.reset(lecturer.id);
      this.handleSuccess(req, res, {
        message: 'Password changed successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  // /**
  //  * Handles the forgot password request for a Lecturer
  //  * @param req
  //  * @param res
  //  * @param body
  //  */
  // @httpPost('/forgot-password', validator(forgotPasswordValidator))
  // async forgotLecturerPassword(
  //   @request() req: Request,
  //   @response() res: Response,
  //   @requestBody() body: ForgotPasswordDTO
  // ) {
  //   try {
  //     const lecturer = await lecturerRepo.model.findOne({
  //       email: body.email
  //     });

  //     if (!lecturer) {
  //       await OTPRateLimiterService.limit(lecturer.id);
  //       throw new NotFoundError('lecturer not found');
  //     }

  //     // do not use jwt to generate reset token generate random alphanumeric string strongly encrypt it and save in redis with an expirty time of 30 minutes and use the token to verify the reset password request
  //     const resetToken = HashingService.generateKey();
  //     const hashToken = await HashingService.toHash(resetToken);

  //     // save the hashed token in redis with an expiry time of 30 minutes
  //     await redis.set(`password_reset_token:${lecturer.id}`, resetToken, {
  //       EX: 1800
  //     });

  //     // Send the reset token to the lecturer's email
  //     emailNodemailerService.sendPasswordResetEmail(
  //       lecturer.email,
  //       lecturer.first_name,
  //       `${env.api_url}/lecturer/reset-password?token=${hashToken}`
  //     );
  //     // for use in cases where you want to limit after certain api calls as it's a public api
  //     await OTPRateLimiterService.limit(lecturer.id);
  //     await OTPRateLimiterService.limit(req.ip);

  //     this.handleSuccess(req, res, {
  //       message: 'Password reset email sent successfully'
  //     });
  //   } catch (err) {
  //     console.log('lecturer found for password reset err:', err);
  //     this.handleError(req, res, err);
  //   }
  // }

  // @httpPost('/reset-password', validator(ResetPasswordValidator))
  // async resetLecturerPassword(
  //   @request() req: Request,
  //   @response() res: Response,
  //   @requestBody() body: ResetPasswordDTO,
  //   @queryParam('token') token: string
  // ) {
  //   try {
  //     const lecturer = await lecturerRepo.model.findOne({
  //       email: body.email
  //     });

  //     if (!lecturer) {
  //       await OTPRateLimiterService.limit(lecturer.id);
  //       throw new NotFoundError('lecturer not found');
  //     }

  //     let cachedToken = await redis.get(`password_reset_token:${lecturer.id}`);

  //     if (!cachedToken) {
  //       await OTPRateLimiterService.limit(lecturer.id);
  //       throw new ControllerError('Invalid or Expired password reset value');
  //     }

  //     const isResetTokenValid = await HashingService.compare(
  //       token, // hashed token
  //       cachedToken // token key
  //     );

  //     if (!isResetTokenValid) {
  //       await OTPRateLimiterService.limit(lecturer.id);
  //       throw new ControllerError('Invalid password reset token');
  //     }

  //     // Update the lecturer's password
  //     await lecturer.updatePassword(body.password);

  //     // still limit it as this is a public endpoint and it help to reduce malicous users
  //     await OTPRateLimiterService.limit(req.ip);
  //     await OTPRateLimiterService.limit(lecturer.id);
  //     await redis.del(`password_reset_token:${lecturer.id}`);

  //     this.handleSuccess(req, res, {
  //       message: 'Password reset successfully'
  //     });
  //   } catch (err) {
  //     console.error('>>>> password reset error', err);
  //     this.handleError(req, res, err);
  //   }
  // }

  /**
   * Handles the forgot password request for a lecturer
   * @param req
   * @param res
   * @param body
   */
  @httpPost('/forgot-password', validator(forgotPasswordValidator))
  async forgotLecturerPasswordV2(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ForgotPasswordDTO
  ) {
    try {
      const lecturer = await lecturerRepo.model.findOne({ email: body.email });

      if (!lecturer) {
        await OTPRateLimiterService.limit(lecturer.id);
        throw new NotFoundError('Lecturer not found');
      }

      // generate random otp and send to email and save the otp in redis with an expiry time of 5 minutes and use the otp to verify the reset password request
      const forgetPasswordOTP = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      // save the hashed token in redis with an expiry time of 30 minutes
      await redis.set(`password_reset_otp:${lecturer.id}`, forgetPasswordOTP, {
        EX: 1800
      });

      // Send the reset token to the lecturer's email
      emailNodemailerService.sendDForgotPasswordResetEmailV2(
        lecturer.email,
        lecturer.first_name,
        forgetPasswordOTP
      );

      // for use in cases where you want to limit after certain api calls as it's a public api
      await OTPRateLimiterService.limit(lecturer.id);
      await OTPRateLimiterService.limit(req.ip);

      this.handleSuccess(req, res, {
        message: 'Forgot Password OTP sent to your email successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost('/otp/reset-password', validator(ResetPasswordValidatorV2))
  async resetLecturerPasswordV2(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ResetPasswordDTOV2
  ) {
    try {
      const lecturer = await lecturerRepo.model.findOne({ email: body.email });
      if (!lecturer) {
        await OTPRateLimiterService.limit(lecturer.id);
        throw new NotFoundError('Lecturer not found');
      }

      let cachedOTP = await redis.get(`password_reset_otp:${lecturer.id}`);
      if (!cachedOTP) {
        await OTPRateLimiterService.limit(lecturer.id);
        throw new ControllerError('Invalid or Expired OTP');
      }

      if (body.otp !== cachedOTP) {
        await OTPRateLimiterService.limit(lecturer.id);
        throw new ControllerError('Invalid or expired password reset otp');
      }

      // Update the lecturer's password
      await lecturer.updatePassword(body.password);

      // still limit it as this is a public endpoint and it help to reduce malicous users
      await OTPRateLimiterService.limit(req.ip);
      await OTPRateLimiterService.limit(lecturer.id);
      await redis.del(`password_reset_otp:${lecturer.id}`);

      this.handleSuccess(req, res, {
        message: 'Password reset successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }
}
