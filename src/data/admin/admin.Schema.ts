import { SchemaFactory, trimmedString } from '../base';
import bcrypt from 'bcrypt';
import { IAdmin } from './admin.model';
import env from '@app/common/config/env';
import { SchemaTypes } from 'mongoose';

export const AdminSchema = SchemaFactory({
  password: { ...trimmedString, required: true, select: false },
  email: { ...trimmedString, unique: true, required: true },
  first_name: { ...trimmedString, index: true, required: true },
  last_name: { ...trimmedString },
  password_changed_at: { type: SchemaTypes.Date },
  role: {
    type: String,
    enum: ['root', 'admin', 'super_admin'],
    required: true,
    default: 'admin'
  },
  is_approved: { type: Boolean, default: false },
  approved_at: { type: SchemaTypes.Date, default: null },
  approved_by: { ref: 'Admin', type: SchemaTypes.String, default: null }
});

/**
 * Mongoose Pre-save hook used to hash passwords for new admin
 */
AdminSchema.pre('save', async function () {
  const admin = <IAdmin>this;
  if (!admin.isNew) return;

  const hash = await bcrypt.hash(admin.password, env.salt_rounds);
  admin.password = hash;
});

/**
 * Document method used to check if a plain text password is the same as a hashed password
 * @param plainText Plain text to be hashed and set as the paswword
 */
AdminSchema.method('isPasswordValid', async function (plainText: string) {
  const admin = <IAdmin>this;
  const result = await bcrypt.compare(plainText, admin.password);
  return result;
});

/**
 * Document method used to change a admin's password.
 * @param plainText Plain text to be hashed and set as the paswword
 */
AdminSchema.method('updatePassword', async function (plainText: string) {
  const admin = <IAdmin>this;
  const hash = await bcrypt.hash(plainText, env.salt_rounds);
  admin.password = hash;
  admin.password_changed_at = new Date();
  return await admin.save();
});

export default AdminSchema;
