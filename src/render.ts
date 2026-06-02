import 'reflect-metadata';
import 'module-alias/register';
import http from 'http';
import env from '@app/common/config/env';
import logger from '@app/common/services/logger/logger';
import App from './server/app';
import DB from './server/db';

// Import your existing worker logic
import { startWorker } from './server/workers/bootstrap';

const startAll = async () => {
  try {
    // CONNECT TO MONGO
    await DB.connect();
    logger.message('📦 MongoDB Connected (Unified Instance)!');

    // BOOT THE BULLMQ WORKERS
    logger.message('🌋 Booting BullMQ Workers...');
    await startWorker();

    // BOOT THE EXPRESS API SERVER
    const app = new App();
    const appServer = app.build();

    // Add a root handler for your Upstash Keep-Alive ping
    appServer.get('/', (req, res) => {
      logger.message('⏰ Keep-alive ping received from Upstash!');
      res.status(200).json({ status: 'API and Workers are active' });
    });

    const httpServer = http.createServer(appServer);
    httpServer.listen(env.port);

    httpServer.on('listening', () =>
      logger.message(
        `🚀 Unified Server running. API listening on ${env.port} & Workers on ${env.worker_port}`
      )
    );
  } catch (err) {
    logger.error(err, 'Fatal unified server error');
    process.exit(1);
  }
};

startAll();
