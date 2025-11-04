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
import methodologyRepo from '@app/data/methodology/methodology.repo';
import jwt from 'jsonwebtoken';
import env from '@app/common/config/env';
import { methodologyLogin, methodologySignup } from './methodology.validator';
import { MethodologyLoginDTO, MethodologySignupDTO } from './methodology.dto';

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
        { expiresIn: Number(env.expires_at) }
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
      const methodology = await methodologyRepo.model.findOne({
        email: body.email
      });

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
        { expiresIn: Number(env.expires_at) }
      );

      this.handleSuccess(req, res, { ...signedData, token });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }
}
