import express, { Request, Response } from 'express';
import http from 'http';
import env from '@app/common/config/env';
import logger from '@app/common/services/logger/logger';
import { subscriber, publisher } from '@random-guys/eventbus';
import db from '../db';

let httpServer: http.Server;
const app = express();
/**
 * Starts the worker
 */
export const startWorker = async () => {
  try {
    if (!env.worker_port)
      throw new Error('Worker http port not specified. Exiting...');

    await db.connect();
    logger.message('📦  MongoDB Connected!');

    await subscriber.init(env.amqp_url);
    await publisher.init(env.amqp_url);

    const subscriberConnection = subscriber.getConnection();
    subscriberConnection.on('error', (err: Error) => {
      logger.error(err);
      process.exit(1);
    });

    // await subscriber.consume(
    //   'STUDENT_ONBOARD_QUEUE',
    //   studentOnboardMethod
    // );

    // Start simple server for k8s health check
    app.get('/', (req: Request, res: Response) => {
      res.status(200).json({ status: 'UP' });
    });
    httpServer = app.listen(env.worker_port);

    logger.message(
      `🌋  backend thesis worker ready!. Health check on port ${env.worker_port}`
    );
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

/**
 * Stops the worker
 */
export const stopWorker = async () => {
  try {
    await subscriber.close();
    await publisher.close();
    await db.disconnect();
    if (httpServer) httpServer.close();
  } catch (err) {
    logger.error(err, 'An error occured while stopping backend thesis worker');
    process.exit(1);
  }
};
