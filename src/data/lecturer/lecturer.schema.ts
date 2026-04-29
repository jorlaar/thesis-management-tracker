import { SchemaFactory, trimmedString } from '../base';
import { ILecturerModel } from './lecturer.model';
import bcrypt from 'bcrypt';
import env from '@app/common/config/env';
import { SchemaTypes } from 'mongoose';

export const LecturerSchema = SchemaFactory({
  password: { ...trimmedString, required: true, select: false },
  email: { ...trimmedString, unique: true, required: true },
  first_name: { ...trimmedString, index: true, required: true },
  last_name: { ...trimmedString },
  department: { ...trimmedString },
  faculty: { ...trimmedString },
  password_changed_at: { type: SchemaTypes.Date }
});

/**
 * Mongoose Pre-save hook used to hash passwords for new lecturer
 */
LecturerSchema.pre('save', async function () {
  const lecturer = <ILecturerModel>this;
  if (!lecturer.isNew) return;

  const hash = await bcrypt.hash(lecturer.password, env.salt_rounds);
  lecturer.password = hash;
});

/**
 * Document method used to check if a plain text password is the same as a hashed password
 * @param plainText Plain text to be hashed and set as the paswword
 */
LecturerSchema.method('isPasswordValid', async function (plainText: string) {
  const lecturer = <ILecturerModel>this;
  const result = await bcrypt.compare(plainText, lecturer.password);
  return result;
});

/**
 * Document method used to change a lecturer's password.
 * @param plainText Plain text to be hashed and set as the paswword
 */
LecturerSchema.method('updatePassword', async function (plainText: string) {
  const lecturer = <ILecturerModel>this;
  const hash = await bcrypt.hash(plainText, env.salt_rounds);
  lecturer.password = hash;
  lecturer.password_changed_at = new Date();
  return await lecturer.save();
});

export default LecturerSchema;
