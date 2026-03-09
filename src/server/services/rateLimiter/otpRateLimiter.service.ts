import { redis } from '@app/common/services/redis';
import { TooManyRequestError } from '../../controllers/base';
// import env from '@app/common/config/env';

// const MAX_TRIES = env.max_otp_tries_per_hour;
const MAX_TRIES = 50;
const WINDOW_DURATION = 60 * 60;
const OTP_TRIES_KEY = 'otp:reg';

/**
 * Handles rate limiting otp code
 */
export class OTPRateLimiterService {
  /**
   * Build the redis key
   * @param id can be a phone number or email or id depending on the use case
   */

  private attemptsKey(id: string) {
    return `${OTP_TRIES_KEY}:${id}`;
  }

  /**
   * Gets the `otp tries` within a min for a id from redis
   * @param id  phone number
   */
  async getTries(id: string) {
    return Number(await redis.get(this.attemptsKey(id)));
  }

  private async setTries(id: string, tries: number) {
    await redis.set(this.attemptsKey(id), tries, {
      EX: WINDOW_DURATION
    });
  }

  /**
   * Increments a student's `otp code attempts` limit and locks the student out if they exceed the allowed daily limit
   * @param id phone number
   */
  async limit(id: string) {
    const tries = await this.getTries(id);
    if (tries === MAX_TRIES) throw new TooManyRequestError();

    await this.setTries(id, tries + 1);
  }

  async reset(id: string) {
    if (this.getTries(id)) await redis.del(this.attemptsKey(id));
  }
}

export default new OTPRateLimiterService();
