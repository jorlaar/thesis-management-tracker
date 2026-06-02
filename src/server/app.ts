import express, { Application } from 'express';
import { InversifyExpressServer } from 'inversify-express-utils';
import responseTime from 'response-time';
import cors from 'cors';
import helmet from 'helmet';
import container from '@app/common/config/ioc';
import env from '../common/config/env';
import loggerMiddleware from './middlewares/requestLogger';
import jsend from './middlewares/jsend';
import { logResponseBody } from './middlewares/logResponseBody';
import { StatusCodes } from 'http-status-codes';
import MetricsService from './services/metrics/metrics.service';
import { redis } from '@app/common/services/redis';
// import logger from '@app/common/services/logger';
import db from './db';
// import { handleUploadErrors } from './middlewares/error.upload';

export default class App {
  private server: InversifyExpressServer;

  constructor() {
    const serverOptions = {
      rootPath: env.api_version // /api/v1
    };

    this.server = new InversifyExpressServer(container, null, serverOptions);

    this.registerMiddlewares();
    this.registerHandlers();
  }

  /**
   * Registers middlewares on the application servers
   */
  private registerMiddlewares() {
    this.server.setConfig((app: Application) => {
      app.use(express.json({ limit: '10mb' }));
      app.use(express.urlencoded({ extended: false, limit: '10mb' }));

      app.disable('x-powered-by');
      app.use(helmet());
      app.use(cors({ origin: true }));
      app.use(responseTime());

      app.use(loggerMiddleware);
      app.use(logResponseBody);

      app.use(jsend);
    });
  }

  /**
   * Registers utility handlers
   */
  private registerHandlers() {
    this.server.setErrorConfig((app: Application) => {
      // app.use(handleUploadErrors);

      app.get('/health', (req, res) => {
        res.status(200).json({ status: 'UP' });
      });

      app.get('/metrics', MetricsService.send);
      // Handle Multer Errors (e.g., file too large)

      app.use((req, res, next) => {
        res.jSend.error(
          null,
          "Whoops! Route doesn't exist.",
          StatusCodes.NOT_FOUND
        );
      });
    });
  }

  // async createDefaultKeys() {
  //   try {
  //     const data = { sample1: 'channel1', sample2: 'channel2' };
  //     redis.set('KEY_BLOCKS', JSON.stringify(data));
  //     logger.message('😎  default channels created');
  //   } catch (error) {
  //     logger.error(error, 'error creating keys');
  //   }
  // }

  /**
   * Applies all routes and configuration to the server, returning the express application server.
   */
  build() {
    const app = this.server.build();
    return app;
  }

  /**
   * Closes MongoDB and Redis connections.
   */
  async closeDB() {
    await db.disconnect();
    await redis.quit();
  }
}
