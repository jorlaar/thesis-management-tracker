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
        throw new ControllerError('Invalid password');
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
        throw new ControllerError('Invalid password');
      }

      const updatedMethodology = await methodology.updatePassword(
        body.new_password
      );
      await updatedMethodology.save();

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
}
