import { redis } from '@app/common/services/redis';
import {
  TransactionPinBlockedError,
  InvalidPinError,
  FrozenWalletError
} from '../../controllers/base';

export const MAX_FAILED_TRIES = 5;
const auth_password_TRIES_KEY = 'auth_password:tries';
const auth_password_LOCKED_KEY = 'auth_password:limit';
const ADMIN_auth_password_LOCKED_KEY = 'admin_auth_password:limit';

/**
 * Handles rate limiting transaction pin attempts
 */
class auth_passwordateLimiterService {
  /**
   * Build the redis key
   * @param mobile_number_number student mobile_number number
   */
  attemptsKey(mobile_number_number: string) {
    return `${auth_password_TRIES_KEY}:${mobile_number_number}`;
  }

  /**
   * Build the redis key
   * @param mobile_number_number student mobile_number number
   */
  blockedKey(mobile_number_number: string) {
    return `${auth_password_LOCKED_KEY}:${mobile_number_number}`;
  }

  /**
   * builds the redis key for student blocked by admin
   * @param mobile_number_number student mobile_number number
   */
  frozenKey(mobile_number_number: string) {
    return `${ADMIN_auth_password_LOCKED_KEY}:${mobile_number_number}`;
  }

  /**
   * Gets the `login tries` within a day for a student from redis
   * @param mobile_number_number student mobile_number number
   */
  async getTries(mobile_number_number: string) {
    return Number(await redis.get(this.attemptsKey(mobile_number_number)));
  }

  private async setTries(mobile_number_number: string, tries = 1) {
    await redis.set(this.attemptsKey(mobile_number_number), tries);
  }

  /**
   * checks if an mobile_number number was locked after transaction pin limit
   * @param mobile_number_number student mobile_number number
   * @returns
   */
  async ismobile_numberLocked(mobile_number_number: string) {
    return await redis.get(this.blockedKey(mobile_number_number));
  }

  /**
   * checks if an mobile_number was frozen by an admin
   * @param mobile_number_number student mobile_number number
   */
  async ismobile_numberFrozen(mobile_number_number: string) {
    return await redis.get(this.frozenKey(mobile_number_number));
  }

  /**
   * Sets the `locked out` status of a student to true
   * @param mobile_number_number student mobile_number number
   */
  private async setLockedOutStatus(mobile_number_number: string) {
    await redis.set(this.blockedKey(mobile_number_number), Number(true));
  }

  /**
   * Increments a student's `transaction pin attempts` limit and locks the student out if they exceed the allowed daily limit
   * @param mobile_number_number student mobile_number number
   */
  async limit(mobile_number_number: string) {
    const tries = await this.getTries(mobile_number_number);
    const updatedTries = tries + 1;
    const remainingTries = MAX_FAILED_TRIES - updatedTries;

    if (updatedTries === MAX_FAILED_TRIES) {
      await this.setLockedOutStatus(mobile_number_number);
      throw new TransactionPinBlockedError();
    }

    await this.setTries(mobile_number_number, updatedTries);
    throw new InvalidPinError(remainingTries);
  }

  /**
   * Checks if a student is logged out and throws an error if they are
   * @param mobile_number_number student mobile_number number
   */
  async isstudentmobile_numberBlocked(mobile_number_number: string) {
    const isLockedOut = await this.ismobile_numberLocked(mobile_number_number);
    if (isLockedOut) throw new TransactionPinBlockedError();
  }

  /**
   * Checks if a student's mobile_number has been frozen by an admin
   * @param mobile_number_number student mobile_number number
   */
  async isstudentmobile_numberFrozen(mobile_number_number: string) {
    const isFrozen = await this.ismobile_numberFrozen(mobile_number_number);
    if (isFrozen) throw new FrozenWalletError();
  }

  async reset(mobile_number_number: string) {
    if (this.getTries(mobile_number_number))
      await redis.del(this.attemptsKey(mobile_number_number));

    if (this.ismobile_numberLocked(mobile_number_number))
      await redis.del(this.blockedKey(mobile_number_number));
  }
}

export default new auth_passwordateLimiterService();
