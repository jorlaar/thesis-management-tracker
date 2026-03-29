import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import {
  controller,
  response,
  request,
  httpGet
} from 'inversify-express-utils';
import lecturerRepo from '@app/data/lecturer/lecturer.repo';
import { ActionNotAllowedError, NotFoundError } from '../base';
import authVerify from '@app/server/middlewares/auth.verify';

@controller('/lecturer')
export default class LecturerController extends BaseController {
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
}
