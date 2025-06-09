import { redis } from '@app/common/services/redis';
import {
  LockedOutError,
  InvalidPasswordError
  // AccountClosedError
} from '../../controllers/base';

const DURATION_ONE_DAY = 60 * 60 * 24;

export const DAILY_FAILED_LOGIN_TRIES = 5;

const LOGIN_TRIES_KEY = 'login:tries';

export const LOCKED_OUT_KEY = 'locked_out:limit';

/**
 * Handles rate limiting login attempts within a day
 */
class PasswordRateLimiterService {
  /**
   * Gets the `login tries` within a day for a student from redis
   * @param account_number student phone number
   */
  async getLoginTries(account_number: string) {
    const key = `${LOGIN_TRIES_KEY}:${account_number}`;
    const loginTries = await redis.get(key);

    return Number(loginTries);
  }

  /**
   * Sets the `login tries` for a student and persists it for a day
   * @param account_number student phone number
   * @param tries Current number of tries for the student. Defaults to `1`
   */
  private async setLoginTries(account_number: string, tries = 1) {
    const key = `${LOGIN_TRIES_KEY}:${account_number}`;
    await redis.set(key, tries, { EX: DURATION_ONE_DAY });
  }

  /**
   * Returns the `locked out` status for a student from redis
   * @param account_number student account number
   */
  async getLockedOutStatus(account_number: string) {
    const key = `${LOCKED_OUT_KEY}:${account_number}`;
    return await redis.get(key);
  }

  /**
   * Sets the `locked out` status of a student to true and persists it for a day
   * @param account_number student phone number
   */
  private async setLockedOutStatus(account_number: string) {
    const key = `${LOCKED_OUT_KEY}:${account_number}`;
    await redis.set(key, Number(true), { EX: DURATION_ONE_DAY });
  }

  /**
   * Increments a student's `login tries` limit and locks the student out if they exceed the allowed daily limit
   * @param account_number student account number
   */
  async limit(account_number: string) {
    const loginTries = await this.getLoginTries(account_number);
    const updatedLoginTries = loginTries + 1;
    const remainingTries = DAILY_FAILED_LOGIN_TRIES - updatedLoginTries;

    if (updatedLoginTries === DAILY_FAILED_LOGIN_TRIES) {
      await this.setLockedOutStatus(account_number);
      throw new LockedOutError();
    }

    await this.setLoginTries(account_number, updatedLoginTries);

    throw new InvalidPasswordError(remainingTries);
  }

  /**
   * Checks if a student is logged out and throws an error if they are
   * @param account_number student account number
   */
  async isstudentLockedOut(account_number: string) {
    const isLockedOut = await this.getLockedOutStatus(account_number);
    if (isLockedOut) throw new LockedOutError();
  }

  /**
   * Resets the locked out status and login limits for a student
   * @param account_number student account number
   */
  async reset(account_number: string) {
    if (this.getLoginTries(account_number))
      await redis.del(`${LOGIN_TRIES_KEY}:${account_number}`);

    if (this.getLockedOutStatus(account_number))
      await redis.del(`${LOCKED_OUT_KEY}:${account_number}`);
  }
}

export default new PasswordRateLimiterService();
