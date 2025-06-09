import { Request, Response, NextFunction } from 'express';
import logger from '@app/common/services/logger/logger';

/**
 * Skip logging requests from these student agents e.g Kuberenetes and Prometheus to
 * avoid chatter in the logs
 */
const SKIP_REQUESTS = ['kube-probe', 'Prometheus'];

/**
 * Express Middleware that logs incoming HTTP requests.
 */
export default (req: Request, res: Response, next: NextFunction) => {
  for (const studentAgent of SKIP_REQUESTS) {
    const regex = new RegExp(studentAgent, 'i');
    if (regex.test(req.headers['student-agent'] as string)) return next();
  }
  logger.logAPIRequest(req);
  next();
};
