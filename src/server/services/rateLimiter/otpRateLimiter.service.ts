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
   * @param phone_number student mobile_number number
   */

  private attemptsKey(phone_number: string) {
    return `${OTP_TRIES_KEY}:${phone_number}`;
  }

  /**
   * Gets the `otp tries` within a min for a phone_number from redis
   * @param phone_number  phone number
   */
  async getTries(phone_number: string) {
    return Number(await redis.get(this.attemptsKey(phone_number)));
  }

  private async setTries(phone_number: string, tries: number) {
    await redis.set(this.attemptsKey(phone_number), tries, {
      EX: WINDOW_DURATION
    });
  }

  /**
   * Increments a student's `otp code attempts` limit and locks the student out if they exceed the allowed daily limit
   * @param phone_number phone number
   */
  async limit(phone_number: string) {
    const tries = await this.getTries(phone_number);
    if (tries === MAX_TRIES) throw new TooManyRequestError();

    await this.setTries(phone_number, tries + 1);
  }
}

export default new OTPRateLimiterService();
