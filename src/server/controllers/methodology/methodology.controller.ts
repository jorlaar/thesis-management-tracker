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
  httpGet
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
        { expiresIn: Number(env.expires_at) }
      );

      // gets all thesis tied to a methodology
      const methodologyPlainDetails = methodology.toObject();
      delete methodologyPlainDetails.password;
      delete methodologyPlainDetails.__v;

      const paginatedThesis = await thesisRepo.list({
        conditions: { methodology_id: methodology._id },
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
}
