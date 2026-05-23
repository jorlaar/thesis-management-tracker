import express, { Request, Response } from 'express';
import http from 'http';
import { Worker } from 'bullmq';
import { redisConnection } from './app';
import db from '../db';
import env from '@app/common/config/env';
import logger from '@app/common/services/logger/logger';
import { SendNotification } from './send-notification';
import { OnboardMethod } from './onboard';

let httpServer: http.Server;
const app = express();
const workers: Worker[] = [];

/**
 * Starts all the queue worker instances. Each worker listens to a specific
 * queue and processes jobs using the defined processor function.
 * https://docs.bullmq.io/
 */
export const startWorker = async () => {
  try {
    if (!env.worker_port)
      throw new Error('Worker http port not specified. Exiting...');

    await db.connect();
    logger.message('📦  MongoDB Connected!');

    // redisConn = new IORedis({
    //   host: env.redis_host,
    //   port: env.redis_port,
    //   maxRetriesPerRequest: null,
    //   enableReadyCheck: false
    // });

    const queueProcessorMap: { queueName: string; data: any }[] = [
      {
        queueName: 'ONBOARDING_QUEUE',
        data: OnboardMethod
      },
      {
        queueName: 'SEND_LOGIN_MESSAGE_QUEUE',
        data: SendNotification
      }
    ];

    for (const { queueName, data } of queueProcessorMap) {
      const worker = new Worker(queueName, data, {
        connection: redisConnection,
        concurrency: 1,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 }
        // attempts: 3,
        // backoff: { attemptsMade: 3, type: 'exponential', delay: 1000 }
      });

      worker.on('completed', (job) => {
        logger.message(`[${queueName}] Job ${job.id} completed`);
      });
      worker.on('failed', (job, err) => {
        logger.error(
          err,
          `[${queueName}] Job ${job?.id} failed: ${err.message}`
        );
      });

      workers.push(worker);
      logger.message(`Worker started for queue: ${queueName}`);
    }

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
 * Stops all the workers gracefully
 */
export const stopWorker = async () => {
  try {
    //close all worker instances
    await Promise.all(workers.map((each) => each.close()));
    logger.message('All BullMQ workers closed');

    // Disconnect ioredis connection
    redisConnection?.disconnect();

    // Disconnect database and close HTTP server
    await db.disconnect();
    if (httpServer) httpServer.close();
  } catch (err) {
    logger.error(err, 'An error occured while stopping backend thesis worker');
    process.exit(1);
  }
};

// import express, { Request, Response } from 'express';
// import http from 'http';
// import env from '@app/common/config/env';
// import logger from '@app/common/services/logger/logger';
// import { subscriber, publisher } from '@random-guys/eventbus';
// import db from '../db';
// import { OnboardMethod } from './onboard';
// import { SendNotification } from './send-notification';

// let httpServer: http.Server;
// const app = express();
// /**
//  * Starts the worker
//  */
// export const startWorker = async () => {
//   try {
//     if (!env.worker_port)
//       throw new Error('Worker http port not specified. Exiting...');

//     await db.connect();
//     logger.message('📦  MongoDB Connected!');

//     await subscriber.init(env.amqp_url);
//     await publisher.init(env.amqp_url);

//     const subscriberConnection = subscriber.getConnection();
//     subscriberConnection.on('error', (err: Error) => {
//       logger.error(err);
//       process.exit(1);
//     });

//     await subscriber.consume('ONBOARDING_QUEUE', OnboardMethod);
//     await subscriber.consume('SEND_LOGIN_MESSAGE_QUEUE', SendNotification);

//     // Start simple server for k8s health check
//     app.get('/', (req: Request, res: Response) => {
//       res.status(200).json({ status: 'UP' });
//     });
//     httpServer = app.listen(env.worker_port);

//     logger.message(
//       `🌋  backend thesis worker ready!. Health check on port ${env.worker_port}`
//     );
//   } catch (err) {
//     logger.error(err);
//     process.exit(1);
//   }
// };

// /**
//  * Stops the worker
//  */
// export const stopWorker = async () => {
//   try {
//     await subscriber.close();
//     await publisher.close();
//     await db.disconnect();
//     if (httpServer) httpServer.close();
//   } catch (err) {
//     logger.error(err, 'An error occured while stopping backend thesis worker');
//     process.exit(1);
//   }
// };
