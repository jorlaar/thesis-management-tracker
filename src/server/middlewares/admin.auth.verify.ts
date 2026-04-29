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

    // const allowedRoles = [
    //   AdminRole.ROOT,
    //   AdminRole.SUPER_ADMIN,
    //   AdminRole.ADMIN
    // ];

    // if (![allowedRoles].includes(payload.data.role)) {
    //   return res.jSend.error(
    //     null,
    //     'You do not have permission to perform this operation',
    //     StatusCodes.FORBIDDEN
    //   );
    // }

    if (!Object.values(AdminRole).includes(payload?.data?.role)) {
      return res.jSend.error(
        null,
        'You do not have permission to perform this operation',
        StatusCodes.FORBIDDEN
      );
    }

    // const isAuthorised = payload.data.role >= 1 && payload.data.role <= 3;
    // if (!isAuthorised) {
    //   return res.jSend.error(
    //     null,
    //     'You do not have permission to perform this operation',
    //     StatusCodes.FORBIDDEN
    //   );
    // }

    if (
      payload.data.role !== AdminRole.ROOT &&
      payload.data.role !== AdminRole.SUPER_ADMIN &&
      payload.data.role !== AdminRole.ADMIN
    ) {
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

  next();
};

// This is a classic logic trap in programming called the "Negative Logic Paradox."
// When you use !== (Not Equal), the logic of OR vs AND flips in a way that feels counterintuitive.
// ## The Problem with OR (||)
// If you use OR, the condition will always be true, no matter what the role is.
// The Logic:

// if (role !== 'root' || role !== 'admin') { ... }

// * If you are 'root': You are not 'admin'. So the second half is True. The whole thing passes.
// * If you are 'admin': You are not 'root'. So the first half is True. The whole thing passes.
// * If you are 'guest': You are not 'root' and not 'admin'. Both are True. The whole thing passes.

// ❌ Result: It is impossible for this condition to ever be False. You will block everyone.
// ------------------------------
// ## The Success of AND (&&)
// When checking for "none of the above," you must ensure the role fails every single check.
// The Logic:

// if (role !== 'root' && role !== 'admin' && role !== 'super_admin') { ... }

// * If you are 'root': The first check is False. Because the first is False, the AND chain breaks. The code inside the if does not run. (Correct!)
// * If you are 'guest': You are not root (True) AND you are not admin (True) AND you are not super_admin (True). All are True, so the if block runs and throws the error. (Correct!)

// ------------------------------
// ## 💡 The Simple Rule of Thumb

// * To check if someone IS one of many things, use === with ||.
// * "Are you a cat OR a dog?"
// * To check if someone IS NOT any of those things, use !== with &&.
// * "You are NOT a cat AND you are NOT a dog."

// ------------------------------
// ## 🛠️ Visualizing the Math (De Morgan's Law)
// In logic, "Not (A or B)" is mathematically the same as "(Not A) and (Not B)".

// | Goal | Logic |
// |---|---|
// | Allowed if A or B | `if (role === A |
// | Denied if NOT (A or B) | `if (!(role === A |
// | Denied if NOT A and NOT B | if (role !== A && role !== B) |

// ------------------------------
// If you want to keep your code clean and avoid this headache, the .includes() method it is usually the safest bet because it handles this logic for you internally!
// That should clear up why the code was "behaving badly" with the ORs?
