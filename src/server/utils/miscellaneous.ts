import { random, times } from 'lodash';
// import jwt from 'jsonwebtoken';
// import { v4 as uuidv4 } from 'uuid';
import { v7 as uuidV7 } from 'uuid';
import { ulid } from 'ulid';

/**
 * Generates random digits of a specified length
 * @param length The amount of random digits to generate and return
 */
export const randomDigits = (length: number) => {
  return times(length, () => random(0, 9).toString()).join('');
};

export const generateUlid = (): string => ulid();

export const generateUuidv7 = (): string => uuidV7();

export interface JwtOptions {
  secret: string;
  iss: string;
  aud: string;
}

// export const generateToken = (
//   tokenPayload: any,
//   { secret, iss, aud }: JwtOptions
// ): string => {
//   const {
//     iat: issuedAt,
//     aud: audience,
//     iss: issuer,
//     exp: expiresAt,
//     jti: jwtId,
//     ...payload
//   } = tokenPayload;

//   const token = jwt.sign(payload, secret, {
//     issuer: iss,
//     audience: aud,
//     expiresIn: '24hr',
//     jwtid: uuidv4()
//   });

//   return token;
// };

/**
 * Removes special characters from gmail addresses
 * Gmail classifies usernames with special characters like `.` & those without it as the same.
 * Therefore, darthvader@gmail.com is the same as darth.vader@gmail.com as well as dar.th.va.der@gmail.com
 * @param email the user's email address
 * @returns a sanitised emailaddress
 */
export function sanitiseGmailAddress(email: string): string {
  const [username, domain] = email.split('@');
  const sanitisedUsername = username.replace(
    /[`~!#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
    ''
  );

  return `${sanitisedUsername}@${domain}`;
}

export const FlaggedWordsForNames = [
  'limited',
  'ltd',
  'limit',
  'limite',
  'pay',
  'loan',
  'credit'
];

export const RegexBuilderForFlaggedWords = () => {
  return new RegExp(`^((?!${FlaggedWordsForNames.join('|')}).)*$`, 'i');
};

// export function encryptString(str: string, secretKey: string): string {
//   const cipher = crypto.createCipher('aes-256-cbc', secretKey);
//   let encrypted = cipher.update(str, 'utf8', 'hex');
//   encrypted += cipher.final('hex');
//   return encrypted;
// }

export function emailRateLimiter(maxEmails: number, timeWindow: number) {
  const emailTimestamps: Record<string, number[]> = {};

  return function canSendEmail(email: string): boolean {
    const now = Date.now();
    if (!emailTimestamps[email]) {
      emailTimestamps[email] = [];
    }

    // Remove timestamps that are outside the time window
    emailTimestamps[email] = emailTimestamps[email].filter(
      (timestamp) => now - timestamp < timeWindow
    );

    if (emailTimestamps[email].length < maxEmails) {
      emailTimestamps[email].push(now);
      return true; // Allow sending email
    } else {
      return false; // Rate limit exceeded
    }
  };
}
