import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import env from '@app/common/config/env';
// import { redis } from '@app/common/services/redis';
import logger from '@app/common/services/logger';

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
    // payload = jwt.verify(token, env.jwt_key, {
    //   issuer: env.jwt_issuers,
    //   audience: env.jwt_aud
    // });

    payload = jwt.verify(token, env.jwt_secret);

    // check if token is expired
    // const isTokenFlagged = await redis.get(payload?.jti);
    // if (isTokenFlagged) {
    //   return res.jSend.error(
    //     null,
    //     'Token has expired, please login again',
    //     StatusCodes.UNAUTHORIZED
    //   );
    // }

    //flag token after use, to prevent been reused
    // await redis.set(payload, {
    //   EX: parseInt(env.axios_timeout, "24hr")
    // });
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

  next();
};
