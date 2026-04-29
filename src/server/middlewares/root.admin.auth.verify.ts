import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import env from '@app/common/config/env';
import logger from '@app/common/services/logger';
import { AdminRole } from '@app/data/admin/admin.model';

export default async (req: Request, res: Response, next: NextFunction) => {
  let token: string;

  if (
    req.headers.authorization &&
    req.headers.authorization.split(' ')[0] === 'Bearer'
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token as string;
  } else if (req.body && req.body.token) {
    token = req.body.token;
  }

  if (!token) {
    return res.jSend.error(
      null,
      'Invalid authentication token',
      StatusCodes.UNAUTHORIZED
    );
  }

  let payload;

  try {
    payload = jwt.verify(token, env.jwt_secret);
    console.log('>>>>>>> payload', payload);
    if (payload.data.role !== AdminRole.ROOT) {
      return res.jSend.error(
        null,
        'You do not have permission to perform this operation',
        StatusCodes.FORBIDDEN
      );
    }
  } catch (err) {
    logger.error(err, 'requireAuth middleware error');
    if (err instanceof jwt.TokenExpiredError) {
      return res.jSend.error(
        null,
        'Authentication token has expired',
        StatusCodes.UNAUTHORIZED
      );
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.jSend.error(
        null,
        'Missing or invalid authentication token',
        StatusCodes.UNAUTHORIZED
      );
    }

    return res.jSend.error(
      null,
      'Error authenticating',
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  req.user_data = payload.data;
    console.log('>>>>>>>  req.user_data',  req.user_data);

  next();
};
