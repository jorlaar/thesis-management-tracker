import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import validator from '@app/server/middlewares/validator';
import {
  controller,
  // httpGet,
  httpPost,
  response,
  request,
  requestBody
} from 'inversify-express-utils';
import { adminLogin, adminSignup } from './admin.validator';
import { AdminLoginDTO, AdminSignupDTO } from './admin.dto';
import adminRepo from '@app/data/admin/admin.repo';
import jwt from 'jsonwebtoken';
import env from '@app/common/config/env';

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
      const admin = await adminRepo.create(body);

      let signedData = {
        id: admin._id,
        email: admin.email
      };
      console.log('>>>>>> admin', admin);

      const token = await jwt.sign(
        {
          data: signedData
        },
        env.jwt_secret,
        { expiresIn: '1d' }
      );
      console.log('>>>>>> admin', token);

      this.handleSuccess(req, res, { id: admin._id, token });
    } catch (err) {
      console.log('>>>>>> err', err);

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
      const admin = await adminRepo.model.findOne({ email: body.email });
      console.log('>>>>>> admin', admin);
      let signedData = {
        id: admin._id,
        email: admin.email
      };

      const token = jwt.sign(
        {
          data: signedData
        },
        env.jwt_secret,
        { expiresIn: '1d' }
      );
      console.log('>>>>>> admin', token);

      this.handleSuccess(req, res, { id: admin._id, token });
    } catch (err) {
      console.log('>>>>>> err', err);

      this.handleError(req, res, err);
    }
  }
}
