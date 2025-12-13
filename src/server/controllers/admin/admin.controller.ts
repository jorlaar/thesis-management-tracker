import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import validator from '@app/server/middlewares/validator';
import {
  controller,
  httpGet,
  httpPost,
  response,
  request,
  requestBody,
  requestParam
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
import studentRepo from '@app/data/student/student.repo';
import thesisRepo from '@app/data/thesis/thesis.repo';
import authVerify from '@app/server/middlewares/auth.verify';
import {
  ActionNotAllowedError,
  BadRequestError,
  ControllerError,
  NotFoundError
} from '../base';

@controller('/admin')
export default class adminController extends BaseController {
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
        { expiresIn: Number(env.expires_at) }
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
        throw new ControllerError('Invalid password');
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
        { expiresIn: Number(env.expires_at) }
      );

      this.handleSuccess(req, res, { ...signedData, token });
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
        throw new ControllerError('Invalid password');
      }

      const updatedAdmin = await admin.updatePassword(body.new_password);

      await updatedAdmin.save();

      this.handleSuccess(req, res, {
        message: 'Password changed successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpGet('/profile', authVerify)
  async getAdminProfile(@request() req: Request, @response() res: Response) {
    try {
      if (req.user_data.type !== 'admin') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const admin = await adminRepo.model.findById(req.user_data.id);

      if (!admin) {
        throw new NotFoundError('admin not found');
      }

      this.handleSuccess(req, res, admin);
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpGet('/:studentEmail/one', authVerify)
  async adminGetMostRecentThesis(
    @request() req: Request,
    @response() res: Response,
    @requestParam('studentEmail') studentEmail: string
  ) {
    try {
      if (!['admin'].includes(req.user_data?.type)) {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const student_details = await studentRepo.model.findOne({
        email: studentEmail
      });
      if (!student_details) {
        throw new NotFoundError('Student not found');
      }
      const viewThesis = await thesisRepo.model
        .findOne({ student_id: student_details.id })
        .sort({ created_at: -1 });

      this.handleSuccess(req, res, {
        viewThesis
      });
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/:thesisId/view', authVerify)
  async adminGetOneThesis(
    @request() req: Request,
    @response() res: Response,
    @requestParam('thesisId') thesisId: string
  ) {
    try {
      if (!['admin'].includes(req.user_data.type)) {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const thesis_details = await thesisRepo.model.findById(thesisId);
      if (!thesis_details) {
        throw new NotFoundError('Student not found');
      }

      this.handleSuccess(req, res, {
        thesis_details
      });
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  @httpGet('/:studentEmail/all', authVerify)
  async adminGetAllStudentThesis(
    @request() req: Request,
    @response() res: Response,
    @requestParam('studentEmail') studentEmail: string
  ) {
    try {
      if (req.user_data.type !== 'admin') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const student_details = await studentRepo.model.findOne(
        { email: studentEmail },
        { _id: 1 } // Only fetch the _id field
      );

      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      const viewThesis = await thesisRepo.model.find(
        { student_id: student_details._id },
        null, // Return all fields
        { sort: { created_at: -1 } } // Sort by most recent first
      );

      if (!viewThesis || viewThesis.length === 0) {
        return this.handleSuccess(req, res, {
          message: 'No thesis documents found for this student',
          viewThesis: []
        });
      }
      this.handleSuccess(req, res, {
        viewThesis
      });
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  // add tracker endpoint for analysis
  @httpGet('/:studentEmail/submission/timetrend', authVerify)
  async adminGetAllStudentThesisSubmissionTimeTrend(
    @request() req: Request,
    @response() res: Response,
    @requestParam('studentEmail') studentEmail: string
  ) {
    try {
      // 1. Authorization check
      if (req.user_data.type !== 'admin') {
        throw new ActionNotAllowedError(
          'Unauthorized: Only admin can perform this operation'
        );
      }

      // 2. Find student by email
      const student_details = await studentRepo.model.findOne({
        email: studentEmail
      });
      if (!student_details) {
        throw new NotFoundError('Student not found');
      }

      // 3. Get the most recent thesis for reference (optional)
      const latestThesis = await thesisRepo.model
        .findOne({ student_id: student_details.id })
        .sort({ created_at: -1 })
        .lean();

      // 4. Aggregate submission time trends FOR THIS SPECIFIC STUDENT
      const submissionTrends = await thesisRepo.model.aggregate([
        {
          $match: {
            student_id: student_details.id,
            student_upload_time_stamp: { $exists: true }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m', // Group by year-month
                date: '$student_upload_time_stamp'
              }
            },
            count: { $sum: 1 },
            // Optional: include tracking IDs
            tracking_ids: { $push: '$thesis_tracking_id' }
          }
        },
        { $sort: { _id: 1 } } // Sort chronologically
      ]);

      // 5. Handle response
      if (!submissionTrends || submissionTrends.length === 0) {
        return this.handleSuccess(req, res, {
          message: 'No thesis submissions found for this student',
          data: {
            trends: [],
            latest_thesis: latestThesis || null
          }
        });
      }
      this.handleSuccess(req, res, {
        data: {
          trends: submissionTrends,
          latest_thesis: latestThesis || null,
          student_info: {
            id: student_details.id,
            email: student_details.email
            // Add other relevant student fields
          }
        }
      });
    } catch (error) {
      this.handleError(req, res, error);
    }
  }
}
