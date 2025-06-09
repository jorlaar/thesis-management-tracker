import { RedisClientType, createClient } from 'redis';
import env from '../config/env';
import logger from './logger/logger';

export class RedisService {
  redis: RedisClientType;

  constructor() {
    const productionOrStagingEnvironment = ['production', 'staging'].includes(
      env.app_env
    );

    this.redis = createClient({
      url: env.redis_url,
      ...(productionOrStagingEnvironment && {
        password: String(env.redis_password)
      })
    });

    this.redis.on('ready', async () => {
      logger.message('🐳  Redis Connected!');
    });

    this.redis.on('error', (err) => {
      logger.error(err, 'An error occurred with the Redis client.');
    });
  }

  async connect() {
    await this.redis.connect();
    // await this.redis.bf.reserve('0', 0.01, 1000);
    logger.message('🐳  Reserved Referral Code Bloom Filter.!');
    return this.redis;
  }
}

export const redis = await new RedisService().connect();
export const redisService = new RedisService();
