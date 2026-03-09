import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import validator from '@app/server/middlewares/validator';
import {
  controller,
  // httpGet,
  httpPost,
  response,
  request,
  requestBody,
  httpGet,
  queryParam
} from 'inversify-express-utils';
import methodologyRepo from '@app/data/methodology/methodology.repo';
import jwt from 'jsonwebtoken';
import env from '@app/common/config/env';
import {
  changeMethodologyPassword,
  methodologyLogin,
  methodologySignup
} from './methodology.validator';
import {
  ChangeMethodologyPasswordDTO,
  MethodologyLoginDTO,
  MethodologySignupDTO
} from './methodology.dto';
import {
  ActionNotAllowedError,
  BadRequestError,
  ControllerError,
  NotFoundError
} from '../base';
import authVerify from '@app/server/middlewares/auth.verify';
import thesisRepo from '@app/data/thesis/thesis.repo';
import { PaginationQueryDTO } from '../thesis/thesis.dto';
import studentRepo from '@app/data/student/student.repo';
import { THESIS_STATUS } from '@app/data/thesis/thesis.model';
import emailNodemailerService from '@app/server/services/email/email.nodemailer.service';
import {
  forgotStudentPassword,
  ResetPasswordValidator
} from '../student/student.validator';
import {
  ForgotStudentPasswordDTO,
  ResetPasswordDTO
} from '../student/student.dto';
import {
  OTPRateLimiterService,
  PasswordRateLimiterService
} from '@app/server/services';
import { redis } from '@app/common/services/redis';
import { HashingService } from '@app/server/utils/hashing';

@controller('/methodology')
export default class methodologyController extends BaseController {
  /**
   * signup methodology
   */
  @httpPost('/', validator(methodologySignup))
  async methodologySignUp(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: MethodologySignupDTO
  ) {
    try {
      const findMethodology = await methodologyRepo.model.findOne({
        email: body.email
      });

      if (findMethodology) {
        throw new ControllerError('Methodology with email already exists');
      }

      const methodology = await methodologyRepo.create(body);

      let signedData: object = {
        id: methodology._id,
        email: methodology.email,
        department: methodology.department,
        faculty: methodology.faculty,
        type: 'methodology'
      };

      const token = jwt.sign(
        {
          data: signedData
        },
        env.jwt_secret,
        { expiresIn: env.expires_at }
      );

      emailNodemailerService.sendWelcomeEmail(
        methodology.email,
        methodology.first_name
      );
      this.handleSuccess(req, res, { ...signedData, token });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost('/login', validator(methodologyLogin))
  async methodologyLogin(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: MethodologyLoginDTO
  ) {
    try {
      const methodology = await methodologyRepo.model
        .findOne({ email: body.email })
        .select('+password');

      if (!methodology) {
        throw new ActionNotAllowedError('Invalid credentials');
      }

      const isPasswordValid = await methodology.isPasswordValid(body.password);

      if (!isPasswordValid) {
        await PasswordRateLimiterService.limit(methodology.id);
        throw new ControllerError('Invalid email or password');
      }

      let signedData: object = {
        id: methodology._id,
        email: methodology.email,
        department: methodology.department,
        faculty: methodology.faculty,
        type: 'methodology'
      };

      const token = jwt.sign(
        {
          data: signedData
        },
        env.jwt_secret,
        { expiresIn: env.expires_at }
      );

      // gets all thesis tied to a methodology
      const methodologyPlainDetails = methodology.toObject();
      delete methodologyPlainDetails.password;
      delete methodologyPlainDetails.__v;

      const paginatedThesis = await thesisRepo.list({
        conditions: { methodology_id: methodology._id },
        populate: ['student_id', 'lecturer_id', 'methodology_id'],
        return_total_pages: true,
        sort: { created_at: -1 },
        page: 1,
        per_page: 2
      });

      await PasswordRateLimiterService.reset(methodology.id);

      this.handleSuccess(req, res, {
        ...methodologyPlainDetails,
        paginatedThesis,
        token
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpGet('/profile', authVerify)
  async getMethodologyProfile(
    @request() req: Request,
    @response() res: Response
  ) {
    try {
      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const methodology = await methodologyRepo.model.findById(
        req.user_data.id
      );

      if (!methodology) {
        throw new NotFoundError('methodology not found');
      }

      this.handleSuccess(req, res, methodology);
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost(
    '/change-password',
    authVerify,
    validator(changeMethodologyPassword)
  )
  async changeMethodologyPassword(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ChangeMethodologyPasswordDTO
  ) {
    try {
      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      if (body.old_password === body.new_password) {
        throw new BadRequestError(
          'New password must be different from old password'
        );
      }

      const methodology = await methodologyRepo.model.findById(
        req.user_data.id,
        '+password'
      );

      if (!methodology) {
        throw new NotFoundError('methodology not found');
      }

      const isPasswordValid = await methodology.isPasswordValid(
        body.old_password
      );

      if (!isPasswordValid) {
        await PasswordRateLimiterService.limit(methodology.id);
        throw new ControllerError('Invalid email or password');
      }

      await methodology.updatePassword(body.new_password);

      await PasswordRateLimiterService.reset(methodology.id);

      this.handleSuccess(req, res, {
        message: 'Password changed successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  // add approval status to return only those approved by the lecturer
  @httpGet('/all/thesis', authVerify)
  async methodologygetAllThesisByDepartment(
    @request() req: Request,
    @response() res: Response,
    @queryParam() query: PaginationQueryDTO
  ) {
    const { page, per_page } = query;
    try {
      if (req.user_data.type !== 'methodology') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const allStudentInDept = await studentRepo.model
        .find({
          department: req.user_data.department
        })
        .select('_id')
        .lean();
      console.log('>>>>>> req.user_data.department', req.user_data.department);
      console.log('>>>>>> allStudentInDept', allStudentInDept);
      const studentIds = allStudentInDept.map((student) => student._id);
      console.log('>>>>>> studentIds', studentIds);
      console.log('>>>>>> ...studentIds', [...studentIds]);

      const getMethodologyDetails = await thesisRepo.list({
        conditions: {
          student_id: { $in: studentIds },
          thesis_status: {
            $in: [
              THESIS_STATUS.approved_by_supervisor,
              THESIS_STATUS.under_methodology_review,
              THESIS_STATUS.revision_requested_by_methodology,
              THESIS_STATUS.approved_by_methodology
            ]
          }
        },
        sort: { created_at: -1 },
        populate: ['student_id', 'lecturer_id', 'methodology_id'],
        page,
        per_page,
        return_total_pages: true
      });
      console.log('>>>>>> getMethodologyDetails', getMethodologyDetails);

      this.handleSuccess(req, res, getMethodologyDetails);
    } catch (error) {
      console.error('>>>>>>> eror', error);
      this.handleError(req, res, error);
    }
  }

  /**
   * Handles the forgot password request for a Methodology
   * @param req
   * @param res
   * @param body
   */
  @httpPost('/forgot-password', validator(forgotStudentPassword))
  async forgotMethodologyPassword(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ForgotStudentPasswordDTO
  ) {
    try {
      const methodology = await methodologyRepo.model.findOne({
        email: body.email
      });

      if (!methodology) {
        await OTPRateLimiterService.limit(methodology.id);
        throw new NotFoundError('methodology not found');
      }

      // do not use jwt to generate reset token generate random alphanumeric string strongly encrypt it and save in redis with an expirty time of 30 minutes and use the token to verify the reset password request
      const resetToken = HashingService.generateKey();
      const hashToken = await HashingService.toHash(resetToken);

      // save the hashed token in redis with an expiry time of 30 minutes
      await redis.set(`password_reset_token:${methodology.id}`, resetToken, {
        EX: 1800
      });

      // Send the reset token to the methodology's email
      emailNodemailerService.sendPasswordResetEmail(
        methodology.email,
        methodology.first_name,
        `${env.api_url}/methodology/reset-password?token=${hashToken}`
      );

      // for use in cases where you want to limit after certain api calls as it's a public api
      await OTPRateLimiterService.limit(methodology.id);
      await OTPRateLimiterService.limit(req.ip);

      this.handleSuccess(req, res, {
        message: 'Password reset email sent successfully'
      });
    } catch (err) {
      console.log('methodology found for password reset err:', err);
      this.handleError(req, res, err);
    }
  }

  @httpPost('/reset-password', validator(ResetPasswordValidator))
  async resetMethodologyPassword(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ResetPasswordDTO,
    @queryParam('token') token: string
  ) {
    try {
      const methodology = await methodologyRepo.model.findOne({
        email: body.email
      });

      if (!methodology) {
        await OTPRateLimiterService.limit(methodology.id);
        throw new NotFoundError('methodology not found');
      }

      let cachedToken = await redis.get(
        `password_reset_token:${methodology.id}`
      );

      if (!cachedToken) {
        await OTPRateLimiterService.limit(methodology.id);
        throw new ControllerError('Invalid or Expired password reset value');
      }

      const isResetTokenValid = await HashingService.compare(
        token, // hashed token
        cachedToken // token key
      );

      if (!isResetTokenValid) {
        await OTPRateLimiterService.limit(methodology.id);
        throw new ControllerError('Invalid password reset token');
      }

      // Update the methodology's password
      await methodology.updatePassword(body.password);

      // still limit it as this is a public endpoint and it help to reduce malicous users
      await OTPRateLimiterService.limit(req.ip);
      await OTPRateLimiterService.limit(methodology.id);
      await redis.del(`password_reset_token:${methodology.id}`);

      this.handleSuccess(req, res, {
        message: 'Password reset successfully'
      });
    } catch (err) {
      console.error('>>>> password reset error', err);
      this.handleError(req, res, err);
    }
  }
}
