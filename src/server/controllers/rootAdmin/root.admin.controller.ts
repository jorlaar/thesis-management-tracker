import { Request, Response } from 'express';
import { BaseController } from '@app/server/controllers/base/base.controller';
import {
  controller,
  httpGet,
  httpPatch,
  request,
  response
} from 'inversify-express-utils';
import authVerify from '@app/server/middlewares/auth.verify';
import { ActionNotAllowedError } from '../base';
import { PasswordRateLimiterService } from '@app/server/services';

@controller('/root-admin')
export default class RootAdminController extends BaseController {
  // must be authenticated as admin to access any route in this controller
  constructor() {
    super();
  }

  @httpGet('/get-user/:id/one', authVerify)
  async getAUserDetailsFromRedis(
    @request() req: Request,
    @response() res: Response
  ) {
    try {
      if (!['admin'].includes(req.user_data?.type)) {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const userId = req.params.id as string;

      if (!userId) {
        throw new ActionNotAllowedError('User ID is required');
      }

      const [userDetails, lockedOutStatus] = await Promise.all([
        PasswordRateLimiterService.getLoginTries(userId),
        PasswordRateLimiterService.getLockedOutStatus(userId)
      ]);

      this.handleSuccess(req, res, {
        stats: userDetails,
        status: lockedOutStatus
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpGet('/get/all/users', authVerify)
  async getAAllLoginTriesUserDetailsFromRedis(
    @request() req: Request,
    @response() res: Response
  ) {
    try {
      if (!['admin'].includes(req.user_data?.type)) {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const [userDetails, lockedOutStatus] = await Promise.all([
        PasswordRateLimiterService.getAllLoginTries(),
        PasswordRateLimiterService.getAllLockedOutStatus()
      ]);

      this.handleSuccess(req, res, {
        userDetails,
        lockedOutStatus
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }

  @httpPatch('/reset-user/:id', authVerify)
  async resetAUserLockedOutStatusFromRedis(
    @request() req: Request,
    @response() res: Response
  ) {
    try {
      if (!['admin'].includes(req.user_data?.type)) {
        throw new ActionNotAllowedError("You can't perform this operation");
      }

      const userId = req.params.id as string;

      if (!userId) {
        throw new ActionNotAllowedError('User ID is required');
      }

      const [userDetails, lockedOutStatus] = await Promise.all([
        PasswordRateLimiterService.getLoginTries(userId),
        PasswordRateLimiterService.getLockedOutStatus(userId),
        PasswordRateLimiterService.reset(userId)
      ]);

      this.handleSuccess(req, res, {
        reset: true,
        userDetails,
        lockedOutStatus
      });
    } catch (err) {
      this.handleError(req, res, err);
    }
  }
}
