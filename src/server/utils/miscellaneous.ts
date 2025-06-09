import { random, times } from 'lodash';
// import jwt from 'jsonwebtoken';
// import { v4 as uuidv4 } from 'uuid';
import { ulid } from 'ulid';

/**
 * Generates random digits of a specified length
 * @param length The amount of random digits to generate and return
 */
export const randomDigits = (length: number) => {
  return times(length, () => random(0, 9).toString()).join('');
};


export const generateId = (): string => ulid();

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
