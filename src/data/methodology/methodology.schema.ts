import { trimmedString, SchemaFactory } from '../base';
import bcrypt from 'bcrypt';
import env from '@app/common/config/env';
import { IMethodology } from './methodology.model';
import { SchemaTypes } from 'mongoose';

const MethodologySchema = SchemaFactory({
  password: { ...trimmedString, required: true, select: false },
  email: { ...trimmedString, unique: true, required: true },
  first_name: { ...trimmedString, index: true, required: true },
  last_name: { ...trimmedString },
  department: { ...trimmedString },
  faculty: { ...trimmedString },
  password_changed_at: { type: SchemaTypes.Date },
  is_approved: { type: Boolean, default: false },
  approved_at: { type: SchemaTypes.Date, default: null },
  approved_by: { ref: 'Admin', type: SchemaTypes.String, default: null }
});

/**
 * Mongoose Pre-save hook used to hash passwords for new lecturer
 */
MethodologySchema.pre('save', async function () {
  const lecturer = <IMethodology>this;
  if (!lecturer.isNew) return;

  const hash = await bcrypt.hash(lecturer.password, env.salt_rounds);
  lecturer.password = hash;
});

/**
 * Document method used to check if a plain text password is the same as a hashed password
 * @param plainText Plain text to be hashed and set as the paswword
 */
MethodologySchema.method('isPasswordValid', async function (plainText: string) {
  const lecturer = <IMethodology>this;
  const result = await bcrypt.compare(plainText, lecturer.password);
  return result;
});

/**
 * Document method used to change a lecturer's password.
 * @param plainText Plain text to be hashed and set as the paswword
 */
MethodologySchema.method('updatePassword', async function (plainText: string) {
  const lecturer = <IMethodology>this;
  const hash = await bcrypt.hash(plainText, env.salt_rounds);
  lecturer.password = hash;
  lecturer.password_changed_at = new Date();
  return await lecturer.save();
});

export default MethodologySchema;
