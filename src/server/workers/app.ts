import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import env from '@app/common/config/env';
import logger from '@app/common/services/logger';

const connection = new IORedis({
  host: env.redis_host,
  // host: 'localhost',
  // port: 6379,
  port: env.redis_port,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// const connection = new IORedis(env.redis_url, {
//   maxRetriesPerRequest: null,
//   enableReadyCheck: false
// });

logger.message(
  `Connected to Redis ${env.redis_host}:${env.redis_port} successfully!`
);

export const onboardingQueue = new Queue('ONBOARDING_QUEUE', { connection });
export const sendLoginMessageQueue = new Queue('SEND_LOGIN_MESSAGE_QUEUE', {
  connection
});
export const sendApprovalMessageQueue = new Queue(
  'SEND_APPROVAL_MESSAGE_QUEUE',
  { connection }
);
export const sendReviewMessageQueue = new Queue('SEND_REVIEW_MESSAGE_QUEUE', {
  connection
});

export const redisConnection = connection;
