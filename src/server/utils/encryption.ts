import crypto from 'crypto';

export const enum EncryptionAlgo {
  AES256CCM = 'aes-256-ccm',
  AES256GCM = 'aes-256-gcm',
  AES256GCR = 'aes-256-ctr'
}

export const encryptJSONString = (
  payload: string,
  algo: EncryptionAlgo,
  secret: string,
  iv_length: number
) => {
  const iv = crypto.randomBytes(iv_length);
  const cipher = crypto.createCipheriv(
    algo,
    Buffer.concat(
      [Buffer.from(secret, 'hex'), Buffer.alloc(32, '', 'hex')],
      32
    ),
    iv
  );

  let encrypted = cipher.update(payload);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decryptString = (
  payload: string,
  algo: EncryptionAlgo,
  secret: string,
  iv_length: number
) => {
  const [iv, encrypted] = payload.split(':');
  const buffered_iv = Buffer.from(iv, 'hex');
  const encrypted_payload = Buffer.from(encrypted, 'hex');
  const decipher = crypto.createDecipheriv(
    algo,
    Buffer.concat([Buffer.from(secret, 'hex'), Buffer.alloc(32)], 32),
    buffered_iv
  );
  let decrypted = decipher.update(encrypted_payload);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};
