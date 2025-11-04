import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import validator from '@app/server/middlewares/validator';
import {
  controller,
  httpPost,
  response,
  request,
  requestBody
} from 'inversify-express-utils';
import { lecturerLogin, lecturerSignup } from './lecturer.validator';
import { LecturerLoginDTO, LecturerSignupDTO } from './lecturer.dto';
import lecturerRepo from '@app/data/lecturer/lecturer.repo';
import jwt from 'jsonwebtoken';
import env from '@app/common/config/env';

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
        { expiresIn: Number(env.expires_at) }
      );

      this.handleSuccess(req, res, { ...signedData, token });
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
      const lecturer = await lecturerRepo.model.findOne({ email: body.email });

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
        { expiresIn: Number(env.expires_at) }
      );

      this.handleSuccess(req, res, { ...signedData, token });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }
}
