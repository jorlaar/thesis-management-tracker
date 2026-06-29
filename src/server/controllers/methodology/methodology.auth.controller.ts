import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import validator from '@app/server/middlewares/validator';
import {
  controller,
  httpPost,
  response,
  request,
  requestBody
  //   httpGet,
  // queryParam
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
// import thesisRepo from '@app/data/thesis/thesis.repo';
import emailNodemailerService from '@app/server/services/email/email.nodemailer.service';
import {
  forgotPasswordValidator,
  ResetPasswordValidatorV2
  // ResetPasswordValidator
} from '../student/student.validator';
import {
  ForgotPasswordDTO,
  ResetPasswordDTOV2
  // ResetPasswordDTO
} from '../student/student.dto';
import {
  OTPRateLimiterService,
  PasswordRateLimiterService
} from '@app/server/services';
import { redis } from '@app/common/services/redis';
import { userType } from '@app/server/constants';
// import { HashingService } from '@app/server/utils/hashing';

@controller('/auth/methodology')
export default class MethodologyAuthController extends BaseController {
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

      // const methodology =
      await methodologyRepo.create(body);

      this.handleSuccess(req, res, {
        message: 'Methodology registration successful, waiting for approval'
      });
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

      if (!methodology.is_approved) {
        await PasswordRateLimiterService.limit(
          req.ip,
          'Your account is pending approval'
        );
        throw new ActionNotAllowedError(
          'Account is pending approval, you will be notified once your account is approved'
        );
      }

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

      // const paginatedThesis = await thesisRepo.list({
      //   conditions: { methodology: methodology._id },
      //   populate: ['student', 'lecturer', 'methodology'],
      //   return_total_pages: true,
      //   sort: { created_at: -1 },
      //   page: 1,
      //   per_page: 10
      // });

      await PasswordRateLimiterService.reset(methodology.id);

      this.handleSuccess(req, res, {
        ...methodologyPlainDetails,
        // paginatedThesis,
        token
      });
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

  /**
  //  * Handles the forgot password request for a Methodology
  //  * @param req
  //  * @param res
  //  * @param body
  //  */
  // @httpPost('/forgot-password', validator(forgotPasswordValidator))
  // async forgotMethodologyPassword(
  //   @request() req: Request,
  //   @response() res: Response,
  //   @requestBody() body: ForgotPasswordDTO
  // ) {
  //   try {
  //     const methodology = await methodologyRepo.model.findOne({
  //       email: body.email
  //     });

  //     if (!methodology) {
  //       await OTPRateLimiterService.limit(methodology.id);
  //       throw new NotFoundError('methodology not found');
  //     }

  //     // do not use jwt to generate reset token generate random alphanumeric string strongly encrypt it and save in redis with an expirty time of 30 minutes and use the token to verify the reset password request
  //     const resetToken = HashingService.generateKey();
  //     const hashToken = await HashingService.toHash(resetToken);

  //     // save the hashed token in redis with an expiry time of 30 minutes
  //     await redis.set(`password_reset_token:${methodology.id}`, resetToken, {
  //       EX: 1800
  //     });

  //     // Send the reset token to the methodology's email
  //     emailNodemailerService.sendPasswordResetEmail(
  //       methodology.email,
  //       methodology.first_name,
  //       `${env.api_url}/methodology/reset-password?token=${hashToken}`
  //     );

  //     // for use in cases where you want to limit after certain api calls as it's a public api
  //     await OTPRateLimiterService.limit(methodology.id);
  //     await OTPRateLimiterService.limit(req.ip);

  //     this.handleSuccess(req, res, {
  //       message: 'Password reset email sent successfully'
  //     });
  //   } catch (err) {
  //     console.log('methodology found for password reset err:', err);
  //     this.handleError(req, res, err);
  //   }
  // }

  // @httpPost('/reset-password', validator(ResetPasswordValidator))
  // async resetMethodologyPassword(
  //   @request() req: Request,
  //   @response() res: Response,
  //   @requestBody() body: ResetPasswordDTO,
  //   @queryParam('token') token: string
  // ) {
  //   try {
  //     const methodology = await methodologyRepo.model.findOne({
  //       email: body.email
  //     });

  //     if (!methodology) {
  //       await OTPRateLimiterService.limit(methodology.id);
  //       throw new NotFoundError('methodology not found');
  //     }

  //     let cachedToken = await redis.get(
  //       `password_reset_token:${methodology.id}`
  //     );

  //     if (!cachedToken) {
  //       await OTPRateLimiterService.limit(methodology.id);
  //       throw new ControllerError('Invalid or Expired password reset value');
  //     }

  //     const isResetTokenValid = await HashingService.compare(
  //       token, // hashed token
  //       cachedToken // token key
  //     );

  //     if (!isResetTokenValid) {
  //       await OTPRateLimiterService.limit(methodology.id);
  //       throw new ControllerError('Invalid password reset token');
  //     }

  //     // Update the methodology's password
  //     await methodology.updatePassword(body.password);

  //     // still limit it as this is a public endpoint and it help to reduce malicous users
  //     await OTPRateLimiterService.limit(req.ip);
  //     await OTPRateLimiterService.limit(methodology.id);
  //     await redis.del(`password_reset_token:${methodology.id}`);

  //     this.handleSuccess(req, res, {
  //       message: 'Password reset successfully'
  //     });
  //   } catch (err) {
  //     console.error('>>>> password reset error', err);
  //     this.handleError(req, res, err);
  //   }
  // }

  /**
   * Handles the forgot password request for a Methodology
   * @param req
   * @param res
   * @param body
   */
  @httpPost('/forgot-password', validator(forgotPasswordValidator))
  async forgotMethodologyPasswordV2(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ForgotPasswordDTO
  ) {
    try {
      await OTPRateLimiterService.limit(req.ip);

      const methodology = await methodologyRepo.model.findOne({
        email: body.email
      });

      if (!methodology) {
        // Still return success to prevent email enumeration attacks
        return this.handleSuccess(req, res, {
          message: 'If the email exists, a password reset OTP has been sent'
        });
      }

      // generate random otp and send to email and save the otp in redis with an expiry time of 5 minutes and use the otp to verify the reset password request
      const forgetPasswordOTP = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      // save the hashed token in redis with an expiry time of 30 minutes
      await redis.set(
        `password_reset_otp:${methodology.id}`,
        forgetPasswordOTP,
        {
          EX: 1800
        }
      );

      // Send the reset token to the methodology's email
      emailNodemailerService.sendDForgotPasswordResetEmailV2(
        methodology.email,
        methodology.first_name,
        forgetPasswordOTP,
        userType.methodology
      );

      // for use in cases where you want to limit after certain api calls as it's a public api
      await OTPRateLimiterService.limit(methodology.id);
      // await OTPRateLimiterService.limit(req.ip);

      this.handleSuccess(req, res, {
        message: 'Forgot Password OTP sent to your email successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost('/otp/reset-password', validator(ResetPasswordValidatorV2))
  async resetMethodologyPasswordV2(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ResetPasswordDTOV2
  ) {
    try {
      await OTPRateLimiterService.limit(req.ip);

      const methodology = await methodologyRepo.model.findOne({
        email: body.email
      });

      if (!methodology) {
           return this.handleSuccess(req, res, {
          message: 'Please check the details passed and try again'
        });
      }

      let cachedOTP = await redis.get(`password_reset_otp:${methodology.id}`);
      if (!cachedOTP) {
        await OTPRateLimiterService.limit(methodology.id);
        throw new ControllerError('Invalid or Expired OTP');
      }

      if (body.otp !== cachedOTP) {
        await OTPRateLimiterService.limit(methodology.id);
        throw new ControllerError('Invalid or expired password reset otp');
      }

      // Update the methodology's password
      await methodology.updatePassword(body.password);

      // still limit it as this is a public endpoint and it help to reduce malicous users
      // await OTPRateLimiterService.limit(req.ip);
      await OTPRateLimiterService.limit(methodology.id);
      await redis.del(`password_reset_otp:${methodology.id}`);

      this.handleSuccess(req, res, {
        message: 'Password reset successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }
}
