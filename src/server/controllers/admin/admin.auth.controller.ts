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
  adminLogin,
  adminSignup,
  changeAdminPassword
} from './admin.validator';
import {
  AdminLoginDTO,
  AdminSignupDTO,
  ChangeAdminPasswordDTO
} from './admin.dto';
import adminRepo from '@app/data/admin/admin.repo';
import jwt from 'jsonwebtoken';
import env from '@app/common/config/env';
import authVerify from '@app/server/middlewares/auth.verify';
import {
  ActionNotAllowedError,
  BadRequestError,
  ControllerError,
  NotFoundError
} from '../base';
import {
  forgotStudentPassword,
  ResetPasswordValidator
} from '../student/student.validator';
import {
  ForgotStudentPasswordDTO,
  ResetPasswordDTO
} from '../student/student.dto';
import { redis } from '@app/common/services/redis';
import {
  OTPRateLimiterService,
  PasswordRateLimiterService
} from '@app/server/services';
import { HashingService } from '@app/server/utils/hashing';
import emailNodemailerService from '@app/server/services/email/email.nodemailer.service';

@controller('/auth/admin')
export default class AdminAuthController extends BaseController {
  /**
   * signup admin
   */
  @httpPost('/', validator(adminSignup))
  async adminSignUp(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: AdminSignupDTO
  ) {
    try {
      const findAdmin = await adminRepo.model.findOne({
        email: body.email
      });

      if (findAdmin) {
        throw new ControllerError('Admin with email already exists');
      }
      const admin = await adminRepo.create(body);

      let signedData: object = {
        id: admin._id,
        email: admin.email,
        type: 'admin'
      };

      const token = jwt.sign(
        {
          data: signedData
        },
        env.jwt_secret,
        { expiresIn: env.expires_at }
      );

      this.handleSuccess(req, res, { ...signedData, token });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost('/login', validator(adminLogin))
  async adminLogin(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: AdminLoginDTO
  ) {
    try {
      const admin = await adminRepo.model
        .findOne({ email: body.email })
        .select('+password');

      if (!admin) {
        throw new ActionNotAllowedError('Invalid credentials');
      }
      const isPasswordValid = await admin.isPasswordValid(body.password);

      if (!isPasswordValid) {
        await PasswordRateLimiterService.limit(admin.id);
        throw new ControllerError('Invalid email or password');
      }
      let signedData: object = {
        id: admin._id,
        email: admin.email,
        type: 'admin'
      };

      const token = jwt.sign(
        {
          data: signedData
        },
        env.jwt_secret,
        { expiresIn: env.expires_at }
      );

      const adminPlainDetails = admin.toObject();
      delete adminPlainDetails.password;
      delete adminPlainDetails.__v;

      await PasswordRateLimiterService.reset(admin.id);

      this.handleSuccess(req, res, { ...adminPlainDetails, token });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost('/change-password', authVerify, validator(changeAdminPassword))
  async changeAdminPassword(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ChangeAdminPasswordDTO
  ) {
    try {
      if (body.old_password === body.new_password) {
        throw new BadRequestError('Password must be different');
      }

      if (body.old_password === body.new_password) {
        throw new BadRequestError(
          'New password must be different from old password'
        );
      }

      if (req.user_data.type !== 'admin') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const admin = await adminRepo.model.findById(
        req.user_data.id,
        '+password'
      );

      if (!admin) {
        throw new NotFoundError('Admin not found');
      }

      const isPasswordValid = await admin.isPasswordValid(body.old_password);

      if (!isPasswordValid) {
        await PasswordRateLimiterService.limit(admin.id);
        throw new ControllerError('Invalid email or password');
      }

      await admin.updatePassword(body.new_password);
      await PasswordRateLimiterService.reset(admin.id);

      this.handleSuccess(req, res, {
        message: 'Password changed successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  /**
   * Handles the forgot password request for a Admin
   * @param req
   * @param res
   * @param body
   */
  @httpPost('/forgot-password', validator(forgotStudentPassword))
  async forgotAdminPassword(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ForgotStudentPasswordDTO
  ) {
    try {
      const admin = await adminRepo.model.findOne({
        email: body.email
      });

      if (!admin) {
        await OTPRateLimiterService.limit(admin.id);
        throw new NotFoundError('admin not found');
      }

      // do not use jwt to generate reset token generate random alphanumeric string strongly encrypt it and save in redis with an expirty time of 30 minutes and use the token to verify the reset password request
      const resetToken = HashingService.generateKey();
      const hashToken = await HashingService.toHash(resetToken);

      // save the hashed token in redis with an expiry time of 30 minutes
      await redis.set(`password_reset_token:${admin.id}`, resetToken, {
        EX: 1800
      });

      // Send the reset token to the admin's email
      emailNodemailerService.sendPasswordResetEmail(
        admin.email,
        admin.first_name,
        `${env.api_url}/admin/reset-password?token=${hashToken}`
      );

      // for use in cases where you want to limit after certain api calls as it's a public api
      await OTPRateLimiterService.limit(admin.id);
      await OTPRateLimiterService.limit(req.ip);

      this.handleSuccess(req, res, {
        message: 'Password reset email sent successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost('/reset-password', validator(ResetPasswordValidator))
  async resetAdminPassword(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ResetPasswordDTO,
    @queryParam('token') token: string
  ) {
    try {
      const admin = await adminRepo.model.findOne({
        email: body.email
      });

      if (!admin) {
        await OTPRateLimiterService.limit(admin.id);
        throw new NotFoundError('admin not found');
      }

      let cachedToken = await redis.get(`password_reset_token:${admin.id}`);

      if (!cachedToken) {
        await OTPRateLimiterService.limit(admin.id);
        throw new ControllerError('Invalid or Expired password reset value');
      }

      const isResetTokenValid = await HashingService.compare(
        token, // hashed token
        cachedToken // token key
      );

      if (!isResetTokenValid) {
        await OTPRateLimiterService.limit(admin.id);
        throw new ControllerError('Invalid password reset token');
      }

      // Update the admin's password
      await admin.updatePassword(body.password);

      // still limit it as this is a public endpoint and it help to reduce malicous users
      await OTPRateLimiterService.limit(req.ip);
      await OTPRateLimiterService.limit(admin.id);
      await redis.del(`password_reset_token:${admin.id}`);

      this.handleSuccess(req, res, {
        message: 'Password reset successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }
}
