import { NextFunction, Response } from 'express';
import { redis } from '@app/common/services/redis';
import { getUnixTime, subHours } from 'date-fns';
import httpCodes from 'http-status-codes';
import env from '@app/common/config/env';

export const rateLimiter = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const redisData = await redis.get(req.id);
    const currentRequestTime = new Date();
    const currentUnixTimestamp = getUnixTime(currentRequestTime);

    const windowStartTimestamp = getUnixTime(
      subHours(currentRequestTime, env.window_size_in_hours)
    );

    let requests = redisData ? JSON.parse(redisData) : [];

    // Filter out old requests
    requests = requests.filter(
      (entry: any) => entry.requestTimeStamp > windowStartTimestamp
    );

    // Calculate total count
    const totalCount = requests.reduce(
      (sum: number, entry: any) => sum + entry.requestCount,
      0
    );

    if (totalCount >= env.max_window_request_count) {
      return res.jSend.error(
        null,
        `Rate limit exceeded. Max ${env.max_window_request_count} requests per ${env.window_size_in_hours} hours.`,
        httpCodes.TOO_MANY_REQUESTS
      );
    }

    // Add current request
    const lastEntry = requests[requests.length - 1];
    const intervalStart = getUnixTime(
      subHours(currentRequestTime, env.window_log_interval_in_hours)
    );

    if (lastEntry && lastEntry.requestTimeStamp > intervalStart) {
      lastEntry.requestCount++;
    } else {
      requests.push({
        requestTimeStamp: currentUnixTimestamp,
        requestCount: 1
      });
    }

    await redis.set(req.id, JSON.stringify(requests));
    next();
  } catch (error) {
    return res.jSend.error(
      res,
      'server error',
      httpCodes.INTERNAL_SERVER_ERROR
    );
  }
};
