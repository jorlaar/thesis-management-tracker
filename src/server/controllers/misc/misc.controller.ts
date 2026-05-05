import { Request, Response } from 'express';
import { BaseController } from '../base';
import {
  controller,
  request,
  response,
//   httpPost
} from 'inversify-express-utils';

@controller('/')
export default class MiscController extends BaseController {
  constructor() {
    super();
  }

//   @httpPost('auth/refresh-token')
  async generateRefreshToken(
    @request() req: Request,
    @response() res: Response
  ) {
    try {

    } catch (error) {
      this.handleError(req, res, error);
    }
  }
}
