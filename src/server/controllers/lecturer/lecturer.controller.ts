import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import validator from '@app/server/middlewares/validator';
import {
  controller,
  httpPost,
  response,
  request,
  requestBody,
  httpGet
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

@controller('/lecturer')
export default class lecturerController extends BaseController {
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
        throw new ControllerError('Invalid password');
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

  @httpGet('/profile', authVerify)
  async getLecturerProfile(@request() req: Request, @response() res: Response) {
    try {
      if (req.user_data.type !== 'lecturer') {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const lecturer = await lecturerRepo.model.findById(req.user_data.id);

      if (!lecturer) {
        throw new NotFoundError('lecturer not found');
      }
      this.handleSuccess(req, res, lecturer);
    } catch (err) {
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
        throw new ControllerError('Invalid password');
      }

      const updatedLecturer = await lecturer.updatePassword(body.new_password);
      await updatedLecturer.save();

      this.handleSuccess(req, res, {
        message: 'Password changed successfully'
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }
}
