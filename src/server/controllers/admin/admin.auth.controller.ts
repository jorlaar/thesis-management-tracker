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
  adminLogin,
  adminSignup,
  approveAdminValidator,
  changeAdminPassword
} from './admin.validator';
import {
  AdminLoginDTO,
  AdminSignupDTO,
  ApproveAdminDTO,
  ChangeAdminPasswordDTO
} from './admin.dto';
import adminRepo from '@app/data/admin/admin.repo';
import jwt from 'jsonwebtoken';
import env from '@app/common/config/env';
import adminAuthVerify from '@app/server/middlewares/admin.auth.verify';
import {
  ActionNotAllowedError,
  BadRequestError,
  ControllerError,
  NotFoundError
} from '../base';
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
import emailNodemailerService from '@app/server/services/email/email.nodemailer.service';
import rootOrSuperAdminAuthVerify from '@app/server/middlewares/admin-root-super.auth.verify';
import rootAdminAuthVerify from '@app/server/middlewares/root.admin.auth.verify';
import { AdminRole, IAdmin } from '@app/data/admin/admin.model';
import { approveValidator } from '../lecturer/lecturer.validator';
import { ApproveDTO } from '../lecturer/lecturer.dto';
import lecturerRepo from '@app/data/lecturer/lecturer.repo';
import methodologyRepo from '@app/data/methodology/methodology.repo';
import studentRepo from '@app/data/student/student.repo';

@controller('/auth/admin')
export default class AdminAuthController extends BaseController {
  /**
   * signup root admin api only accessible for root admin signup
   * disabled only enabled for the first time when there is no root admin in the system after that it should be disabled
   * and only used for per usecase
   */
  // @httpPost('/root', validator(adminSignup))
  async rootAdminSignUp(
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

      let data = {
        ...body,
        role: AdminRole.ROOT,
        is_approved: true,
        approved_at: new Date()
      };

      const admin = await adminRepo.create(data);

      let signedData: object = {
        id: admin._id,
        email: admin.email,
        type: 'admin',
        role: AdminRole.ROOT
      };

      const token = jwt.sign(
        {
          data: signedData
        },
        env.jwt_secret,
        { expiresIn: env.expires_at }
      );

      // admin.role = AdminRole.ROOT;
      // admin.is_approved = true;
      // admin.approved_at = new Date();
      // admin.save();

      this.handleSuccess(req, res, { ...signedData, token });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  /**
   * signup super admin api only will have to wait for
   * approval from root admin before they can login and access protected routes
   */
  @httpPost('/super', validator(adminSignup))
  async superAdminSignUp(
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

      let data = {
        ...body,
        role: AdminRole.SUPER_ADMIN
      };
      // const admin =
      await adminRepo.create(data);

      // todo send webhook notification to root admin for approval

      this.handleSuccess(req, res, {
        message: 'Super admin registration successful, waiting for approval'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  /**
   * signup normal admin
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

      // creates the default role as admin in the db already set
      // const admin =
      await adminRepo.create(body);

      // todo send webhook notification to super_admin for approval

      this.handleSuccess(req, res, {
        message: 'Admin registration successful, waiting for approval'
      });
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
      const admin: IAdmin = await adminRepo.model
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

      if (!Object.values(AdminRole).includes(admin.role)) {
        await PasswordRateLimiterService.limit(
          admin.id,
          'You do not have permission to perform this operation'
        );
        await PasswordRateLimiterService.limit(
          req.ip,
          `You don't have permission to perform this operation`
        );
        throw new ActionNotAllowedError(
          'You do not have permission to perform this operation'
        );
      }

      const restrictedAccessRoles = [AdminRole.SUPER_ADMIN, AdminRole.ADMIN];

      if (restrictedAccessRoles.includes(admin.role) && !admin.is_approved) {
        await PasswordRateLimiterService.limit(
          admin.id,
          'Your account is pending approval'
        );
        await PasswordRateLimiterService.limit(
          req.ip,
          'Your account is pending approval'
        );
        throw new ActionNotAllowedError(
          'Account is pending approval, you will be notified once your account is approved'
        );
      }

      let signedData: object = {
        id: admin._id,
        email: admin.email,
        type: 'admin',
        role: admin.role
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

  @httpPost(
    '/approve/super-admin',
    rootAdminAuthVerify,
    validator(approveAdminValidator)
  )
  async approveSuperAdmin(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ApproveAdminDTO
  ) {
    try {
      const [approvingAdminDetails, approveeAdminDetails] = await Promise.all([
        adminRepo.model.findOne({
          email: body.approver_email
        }),
        adminRepo.model.findOne({
          email: body.approvee_email
        })
      ]);

      if (!approvingAdminDetails || !approveeAdminDetails) {
        throw new ActionNotAllowedError(
          'One or both email account not found.!'
        );
      }

      if (approveeAdminDetails.id === approvingAdminDetails.id) {
        throw new ActionNotAllowedError('You cannot approve yourself');
      }

      if (approvingAdminDetails.role !== AdminRole.ROOT) {
        throw new ActionNotAllowedError(
          'only root admins can approve a super admin'
        );
      }

      if (!approvingAdminDetails.is_approved) {
        throw new ActionNotAllowedError(
          'Root Admin must be approved first contact support for more details'
        );
      }

      if (approveeAdminDetails.role !== AdminRole.SUPER_ADMIN) {
        throw new ActionNotAllowedError(
          'You can only approve super admins with this endpoint'
        );
      }

      if (approveeAdminDetails.is_approved) {
        throw new ActionNotAllowedError(
          'Admin is already approved, you cannot perform this operation'
        );
      }

      approveeAdminDetails.is_approved = true;
      approveeAdminDetails.approved_at = new Date();
      approveeAdminDetails.approved_by = approvingAdminDetails.id;
      await approveeAdminDetails.save();
      // send webhook for successful approval notification to the approvee admin

      this.handleSuccess(req, res, {
        message: `${approveeAdminDetails.first_name} ${approveeAdminDetails.last_name} has been approved successfully`
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost(
    '/approve/admin',
    rootOrSuperAdminAuthVerify,
    validator(approveAdminValidator)
  )
  async approveAdmin(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ApproveAdminDTO
  ) {
    try {
      const [approvingAdminDetails, approveeAdminDetails] = await Promise.all([
        await adminRepo.model.findOne({
          email: body.approver_email
        }),
        await adminRepo.model.findOne({
          email: body.approvee_email
        })
      ]);

      if (!approvingAdminDetails || !approveeAdminDetails) {
        throw new ActionNotAllowedError('One or both email account not found!');
      }

      if (approveeAdminDetails.id === approvingAdminDetails.id) {
        throw new ActionNotAllowedError('You cannot approve yourself');
      }

      const allowedApproverRoles = [AdminRole.ROOT, AdminRole.SUPER_ADMIN];

      if (!allowedApproverRoles.includes(approvingAdminDetails.role)) {
        throw new ActionNotAllowedError(
          'only root admins and super admins can approve a admin'
        );
      }

      if (!approvingAdminDetails.is_approved) {
        throw new ActionNotAllowedError(
          'Approving Admin must first be approved, please contact support for more details'
        );
      }

      if (approveeAdminDetails.role !== AdminRole.ADMIN) {
        throw new ActionNotAllowedError(
          'You can only approve regular admins with this api'
        );
      }

      if (approveeAdminDetails.is_approved) {
        throw new ActionNotAllowedError(
          'Admin is already approved, you cannot perform this operation'
        );
      }

      approveeAdminDetails.is_approved = true;
      approveeAdminDetails.approved_at = new Date();
      approveeAdminDetails.approved_by = approvingAdminDetails.id;
      await approveeAdminDetails.save();
      // send webhook for successful approval notification to the approvee admin

      this.handleSuccess(req, res, {
        message: `${approveeAdminDetails.first_name} ${approveeAdminDetails.last_name} has been approved successfully`
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost('/change-password', adminAuthVerify, validator(changeAdminPassword))
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

  // /**
  //  * Handles the forgot password request for a Admin
  //  * @param req
  //  * @param res
  //  * @param body
  //  */
  // @httpPost('/forgot-password', validator(forgotPasswordValidator))
  // async forgotAdminPassword(
  //   @request() req: Request,
  //   @response() res: Response,
  //   @requestBody() body: ForgotPasswordDTO
  // ) {
  //   try {
  //     const admin = await adminRepo.model.findOne({
  //       email: body.email
  //     });

  //     if (!admin) {
  //       await OTPRateLimiterService.limit(admin.id);
  //       throw new NotFoundError('admin not found');
  //     }

  //     // do not use jwt to generate reset token generate random alphanumeric string strongly encrypt it and save in redis with an expirty time of 30 minutes and use the token to verify the reset password request
  //     const resetToken = HashingService.generateKey();
  //     const hashToken = await HashingService.toHash(resetToken);

  //     // save the hashed token in redis with an expiry time of 30 minutes
  //     await redis.set(`password_reset_token:${admin.id}`, resetToken, {
  //       EX: 1800
  //     });

  //     // Send the reset token to the admin's email
  //     emailNodemailerService.sendPasswordResetEmail(
  //       admin.email,
  //       admin.first_name,
  //       `${env.api_url}/admin/reset-password?token=${hashToken}`
  //     );

  //     // for use in cases where you want to limit after certain api calls as it's a public api
  //     await OTPRateLimiterService.limit(admin.id);
  //     await OTPRateLimiterService.limit(req.ip);

  //     this.handleSuccess(req, res, {
  //       message: 'Password reset email sent successfully'
  //     });
  //   } catch (err) {
  //     this.handleError(req, res, err);
  //   }
  // }

  // @httpPost('/reset-password', validator(ResetPasswordValidator))
  // async resetAdminPassword(
  //   @request() req: Request,
  //   @response() res: Response,
  //   @requestBody() body: ResetPasswordDTO,
  //   @queryParam('token') token: string
  // ) {
  //   try {
  //     const admin = await adminRepo.model.findOne({
  //       email: body.email
  //     });

  //     if (!admin) {
  //       await OTPRateLimiterService.limit(admin.id);
  //       throw new NotFoundError('admin not found');
  //     }

  //     let cachedToken = await redis.get(`password_reset_token:${admin.id}`);

  //     if (!cachedToken) {
  //       await OTPRateLimiterService.limit(admin.id);
  //       throw new ControllerError('Invalid or Expired password reset value');
  //     }

  //     const isResetTokenValid = await HashingService.compare(
  //       token, // hashed token
  //       cachedToken // token key
  //     );

  //     if (!isResetTokenValid) {
  //       await OTPRateLimiterService.limit(admin.id);
  //       throw new ControllerError('Invalid password reset token');
  //     }

  //     // Update the admin's password
  //     await admin.updatePassword(body.password);

  //     // still limit it as this is a public endpoint and it help to reduce malicous users
  //     await OTPRateLimiterService.limit(req.ip);
  //     await OTPRateLimiterService.limit(admin.id);
  //     await redis.del(`password_reset_token:${admin.id}`);

  //     this.handleSuccess(req, res, {
  //       message: 'Password reset successfully'
  //     });
  //   } catch (err) {
  //     this.handleError(req, res, err);
  //   }
  // }

  /**
   * Handles the forgot password request for a admin
   * @param req
   * @param res
   * @param body
   */
  @httpPost('/forgot-password', validator(forgotPasswordValidator))
  async forgotAdminPasswordV2(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ForgotPasswordDTO
  ) {
    try {
      const admin = await adminRepo.model.findOne({ email: body.email });

      if (!admin) {
        await OTPRateLimiterService.limit(admin.id);
        throw new NotFoundError('Admin not found');
      }

      // generate random otp and send to email and save the otp in redis with an expiry time of 5 minutes and use the otp to verify the reset password request
      const forgetPasswordOTP = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      // save the hashed token in redis with an expiry time of 30 minutes
      await redis.set(`password_reset_otp:${admin.id}`, forgetPasswordOTP, {
        EX: 1800
      });

      // Send the reset token to the admin's email
      emailNodemailerService.sendDForgotPasswordResetEmailV2(
        admin.email,
        admin.first_name,
        forgetPasswordOTP
      );

      // for use in cases where you want to limit after certain api calls as it's a public api
      await OTPRateLimiterService.limit(admin.id);
      await OTPRateLimiterService.limit(req.ip);

      this.handleSuccess(req, res, {
        message: 'Forgot Password OTP sent to your email successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost('/otp/reset-password', validator(ResetPasswordValidatorV2))
  async resetAdminPasswordV2(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ResetPasswordDTOV2
  ) {
    try {
      const admin = await adminRepo.model.findOne({ email: body.email });
      if (!admin) {
        await OTPRateLimiterService.limit(admin.id);
        throw new NotFoundError('Admin not found');
      }

      let cachedOTP = await redis.get(`password_reset_otp:${admin.id}`);
      if (!cachedOTP) {
        await OTPRateLimiterService.limit(admin.id);
        throw new ControllerError('Invalid or Expired OTP');
      }

      if (body.otp !== cachedOTP) {
        await OTPRateLimiterService.limit(admin.id);
        throw new ControllerError('Invalid or expired password reset otp');
      }

      // Update the admin's password
      await admin.updatePassword(body.password);

      // still limit it as this is a public endpoint and it help to reduce malicous users
      await OTPRateLimiterService.limit(req.ip);
      await OTPRateLimiterService.limit(admin.id);
      await redis.del(`password_reset_otp:${admin.id}`);

      this.handleSuccess(req, res, {
        message: 'Password reset successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost(
    '/approve/lecturer',
    rootOrSuperAdminAuthVerify,
    validator(approveValidator)
  )
  async approveLecturer(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ApproveDTO
  ) {
    try {
      const [approvingAdminDetails, approveeLecturerDetails] =
        await Promise.all([
          adminRepo.model.findOne({
            email: body.approving_admin_email
          }),
          lecturerRepo.model.findOne({
            email: body.approvee_email
          })
        ]);

      if (!approvingAdminDetails || !approveeLecturerDetails) {
        throw new ActionNotAllowedError(
          'One or both email account not found.!'
        );
      }

      if (approveeLecturerDetails.id === approvingAdminDetails.id) {
        throw new ActionNotAllowedError('You cannot approve yourself');
      }

      const allowedApproverRoles = [AdminRole.ROOT, AdminRole.SUPER_ADMIN];

      if (!allowedApproverRoles.includes(approvingAdminDetails.role)) {
        throw new ActionNotAllowedError(
          'only root admins and super admins can approve a lecturer'
        );
      }

      if (!approvingAdminDetails.is_approved) {
        throw new ActionNotAllowedError(
          'Approving Admin must first be approved, please contact support for more details'
        );
      }

      if (approveeLecturerDetails.is_approved) {
        throw new ActionNotAllowedError(
          'Lecturer is already approved, you cannot perform this operation'
        );
      }

      approveeLecturerDetails.is_approved = true;
      approveeLecturerDetails.approved_at = new Date();
      approveeLecturerDetails.approved_by = approvingAdminDetails.id;
      await approveeLecturerDetails.save();
      // send webhook for successful approval notification to the approvee lecturer

      this.handleSuccess(req, res, {
        message: `${approveeLecturerDetails.first_name} ${approveeLecturerDetails.last_name} has been approved successfully`
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost(
    '/approve/methodology',
    rootOrSuperAdminAuthVerify,
    validator(approveValidator)
  )
  async approveMethodology(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ApproveDTO
  ) {
    try {
      const [approvingAdminDetails, approveeMethodologyDetails] =
        await Promise.all([
          adminRepo.model.findOne({
            email: body.approving_admin_email
          }),
          methodologyRepo.model.findOne({
            email: body.approvee_email
          })
        ]);

      if (!approvingAdminDetails || !approveeMethodologyDetails) {
        throw new ActionNotAllowedError(
          'One or both email account not found.!'
        );
      }

      if (approveeMethodologyDetails.id === approvingAdminDetails.id) {
        throw new ActionNotAllowedError('You cannot approve yourself');
      }

      const allowedApproverRoles = [AdminRole.ROOT, AdminRole.SUPER_ADMIN];

      if (!allowedApproverRoles.includes(approvingAdminDetails.role)) {
        throw new ActionNotAllowedError(
          'only root admins and super admins can approve a methodology'
        );
      }

      if (!approvingAdminDetails.is_approved) {
        throw new ActionNotAllowedError(
          'Approving Admin must first be approved, please contact support for more details'
        );
      }

      if (approveeMethodologyDetails.is_approved) {
        throw new ActionNotAllowedError(
          'Methodology is already approved, you cannot perform this operation'
        );
      }

      approveeMethodologyDetails.is_approved = true;
      approveeMethodologyDetails.approved_at = new Date();
      approveeMethodologyDetails.approved_by = approvingAdminDetails.id;
      await approveeMethodologyDetails.save();
      // send webhook for successful approval notification to the approvee Methodology

      this.handleSuccess(req, res, {
        message: `${approveeMethodologyDetails.first_name} ${approveeMethodologyDetails.last_name} has been approved successfully`
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPost(
    '/approve/student',
    rootOrSuperAdminAuthVerify,
    validator(approveValidator)
  )
  async approveStudent(
    @request() req: Request,
    @response() res: Response,
    @requestBody() body: ApproveDTO
  ) {
    try {
      const [approvingAdminDetails, approveeStudentDetails] = await Promise.all(
        [
          adminRepo.model.findOne({
            email: body.approving_admin_email
          }),
          studentRepo.model.findOne({
            email: body.approvee_email
          })
        ]
      );

      if (!approvingAdminDetails || !approveeStudentDetails) {
        throw new ActionNotAllowedError(
          'One or both email account not found.!'
        );
      }

      if (approveeStudentDetails.id === approvingAdminDetails.id) {
        throw new ActionNotAllowedError('You cannot approve yourself');
      }

      const allowedApproverRoles = [AdminRole.ROOT, AdminRole.SUPER_ADMIN];

      if (!allowedApproverRoles.includes(approvingAdminDetails.role)) {
        throw new ActionNotAllowedError(
          'only root admins and super admins can approve a student'
        );
      }

      if (!approvingAdminDetails.is_approved) {
        throw new ActionNotAllowedError(
          'Approving Admin must first be approved, please contact support for more details'
        );
      }

      if (approveeStudentDetails.is_approved) {
        throw new ActionNotAllowedError(
          'Student is already approved, you cannot perform this operation'
        );
      }

      approveeStudentDetails.is_approved = true;
      approveeStudentDetails.approved_at = new Date();
      approveeStudentDetails.approved_by = approvingAdminDetails.id;
      await approveeStudentDetails.save();
      // send webhook for successful approval notification to the approvee Student

      this.handleSuccess(req, res, {
        message: `${approveeStudentDetails.first_name} ${approveeStudentDetails.last_name} has been approved successfully`
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }
}
