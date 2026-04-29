import { redis } from '@app/common/services/redis';
import { LockedOutError, InvalidPasswordError } from '../../controllers/base';

// const DURATION_ONE_DAY = 60 * 60 * 24; // 1d
const DURATION_ONE_HOUR = 60 * 60; // 1H

export const DAILY_FAILED_LOGIN_TRIES = 7; // 7 tries per day

const LOGIN_TRIES_KEY = 'login:tries';

export const LOCKED_OUT_KEY = 'locked_out:limit';

/**
 * Handles rate limiting login attempts within a day
 */
class PasswordRateLimiterService {
  /**
   * Sets the `login tries` for a user and persists it for a day
   * @param id user id
   * @param tries Current number of tries for the user. Defaults to `1`
   */
  private async setLoginTries(id: string, tries = 1) {
    const key = `${LOGIN_TRIES_KEY}:${id}`;
    await redis.set(key, tries, { EX: DURATION_ONE_HOUR });
  }

  /**
   * Sets the `locked out` status of a user to true and persists it for a day
   * @param id user id
   */
  async setLockedOutStatus(id: string) {
    const key = `${LOCKED_OUT_KEY}:${id}`;
    await redis.set(key, Number(true), { EX: DURATION_ONE_HOUR });
  }

  /**
   * Returns the `locked out` status for a user from redis
   * @param id user id
   */
  async getLockedOutStatus(id: string) {
    const key = `${LOCKED_OUT_KEY}:${id}`;
    const val = await redis.get(key);
    return val;
  }

  /**
   * Gets the `login tries` within a day for a user from redis
   * @param id user id
   */
  async getLoginTries(id: string) {
    const key = `${LOGIN_TRIES_KEY}:${id}`;
    const loginTries = await redis.get(key);

    return Number(loginTries);
  }

  /**
   * Increments a user's `login tries` limit and locks the user out if they exceed the allowed daily limit
   * @param id user id
   * @param err_message Optional error message
   */
  async limit(id: string, err_message?: string) {
    const loginTries = await this.getLoginTries(id);
    const updatedLoginTries = loginTries + 1;
    const remainingTries = DAILY_FAILED_LOGIN_TRIES - updatedLoginTries;

    if (updatedLoginTries === DAILY_FAILED_LOGIN_TRIES) {
      await this.setLockedOutStatus(id);
      throw new LockedOutError();
    }

    await this.setLoginTries(id, updatedLoginTries);

    throw new InvalidPasswordError(remainingTries, err_message);
  }

  /**
   * Checks if a user is logged out and throws an error if they are
   * @param id user id
   */
  async isuserLockedOut(id: string) {
    const isLockedOut = await this.getLockedOutStatus(id);
    if (isLockedOut) throw new LockedOutError();
  }

  /**
   * Resets the locked out status and login limits for a user
   * @param id user id
   */
  async reset(id: string) {
    if (this.getLoginTries(id)) await redis.del(`${LOGIN_TRIES_KEY}:${id}`);

    if (this.getLockedOutStatus(id)) await redis.del(`${LOCKED_OUT_KEY}:${id}`);
  }

  async getAllLoginTries(cursor = 0, count = 1000) {
    try {
      const result = await redis.scan(cursor, {
        MATCH: `${LOGIN_TRIES_KEY}:*`,
        COUNT: count
      });
      const nextCursor = result.cursor;
      const keys = result.keys;

      const ids = keys.map((key: string) => key.split(':')[2]); // Extract user IDs from keys

      const triespromises = ids.map((id: string) => this.getLoginTries(id));
      const triesResults = await Promise.all(triespromises);

      const loginTriesData = {};

      ids.forEach((id: string, index: number) => {
        loginTriesData[id] = triesResults[index];
      });

      return { nextCursor, data: loginTriesData, hasMore: nextCursor !== 0 };
    } catch (err) {
      throw err;
    }
  }

  async getAllLockedOutStatus(cursor = 0, count = 100) {
    try {
      const result = await redis.scan(cursor, {
        MATCH: `${LOCKED_OUT_KEY}:*`,
        COUNT: count
      });

      const keys = result.keys;
      const nextCursor = result.cursor;

      if (keys.length === 0) {
        return {
          nextCursor,
          data: {},
          hasMore: nextCursor !== 0
        };
      }

      // Get values and TTL in parallel
      const multi = redis.multi();
      // results might look like: ["1", "900", "0", "-1", "1", "3600"]
      //                          └get1┘,└ttl1┘,└get2┘,└ttl2┘,└get3┘,└ttl3┘
      // TTLs are strings: "900", "-1", "3600"

      keys.forEach((key) => {
        multi.get(key);
        multi.ttl(key);
      });

      const results = await multi.exec();

      const lockedOutData = {};

      keys.forEach((key, index) => {
        const id = key.split(':')[2];
        const value = results[index * 2];
        const ttl = Number(results[index * 2 + 1]);

        // Convert string "1" to boolean properly
        const isLocked = value === '1' || value === 'true';

        lockedOutData[id] = {
          isLocked,
          ttl,
          expiresIn: ttl > 0 ? this.formatDuration(ttl) : null,
          expiresAt:
            ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : null
        };
      });

      return {
        nextCursor,
        data: lockedOutData,
        hasMore: nextCursor !== 0
      };
    } catch (err) {
      console.error('Error fetching locked out status:', err);
      throw err;
    }
  }

  // Helper function to format TTL
  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const hour = Math.floor(seconds / 3600);
    if (hour > 0) return `${hour}h ${this.formatDuration(seconds % 3600)}`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${hour}h ${minutes}m ${remainingSeconds}s`;
  }
}

export default new PasswordRateLimiterService();
