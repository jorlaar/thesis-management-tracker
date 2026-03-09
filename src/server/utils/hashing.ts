import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class HashingService {
  static async toHash(
    token: string,
    salt: string = this.generateRandomBytes()
  ) {
    const buf = (await scryptAsync(token, salt, 64)) as Buffer;

    return `${buf.toString('hex')}.${salt}`;
  }

  static async compare(hash: string, plainText: string) {
    const [hashedToken, salt] = hash.split('.');
    const buf = (await scryptAsync(plainText, salt, 64)) as Buffer;

    return buf.toString('hex') === hashedToken;
  }

  static generateRandomBytes(length: number = 16) {
    return randomBytes(length).toString('hex');
  }

  static generateKey() {
    return Buffer.from(
      Math.random().toString(36).substring(2) + Date.now().toString(36)
    )
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 32);
  }
}
