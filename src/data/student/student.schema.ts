import {
  SchemaTypes
  // Schema
} from 'mongoose';
import bcrypt from 'bcrypt';
import {
  trimmedString,
  SchemaFactory
  //  uuid
} from '../base';
import { IStudentModel, StudentLevel } from './student.model';
import env from '@app/common/config/env';

const StudentSchema = SchemaFactory({
  password: { ...trimmedString, required: true, select: false },
  // email: { ...trimmedString, unique: true, sparse: true },
  email: { ...trimmedString, unique: true, required: true },

  first_name: { ...trimmedString, index: true, required: true },
  last_name: { ...trimmedString },
  department: { ...trimmedString },
  faculty: { ...trimmedString },

  // course: { ...trimmedString },
  matric_no: { ...trimmedString },
  // thesis: {
  //   ...trimmedString
  // }, // generate signed url for this (if it only contains a filepath)
  gender: { ...trimmedString, enum: ['male', 'female'] },
  // dob: { type: SchemaTypes.Date, default: null },
  // dob: { type: SchemaTypes.Date },
  level: {
    type: String,
    enum: Object.values(StudentLevel),
    required: true,
    default: StudentLevel.MASTERS
  },
  password_changed_at: { type: SchemaTypes.Date, select: false },
  is_approved: { type: Boolean, default: false },
  approved_at: { type: SchemaTypes.Date, default: null },
  approved_by: { ref: 'Admin', type: SchemaTypes.String, default: null }
});

/**
 * Mongoose Pre-save hook used to hash passwords for new students
 */
StudentSchema.pre('save', async function () {
  const student = <IStudentModel>this;
  if (!student.isNew) return;

  const hash = await bcrypt.hash(student.password, env.salt_rounds);
  student.password = hash;
});

/**
 * Document method used to check if a plain text password is the same as a hashed password
 * @param plainText Plain text to be hashed and set as the paswword
 */
StudentSchema.method('isPasswordValid', async function (plainText: string) {
  const student = <IStudentModel>this;
  const result = await bcrypt.compare(plainText, student.password);
  return result;
});

/**
 * Document method used to change a student's password.
 * @param plainText Plain text to be hashed and set as the paswword
 */
StudentSchema.method('updatePassword', async function (plainText: string) {
  const student = <IStudentModel>this;
  const hash = await bcrypt.hash(plainText, env.salt_rounds);
  student.password = hash;
  student.password_changed_at = new Date();
  return await student.save();
});

export default StudentSchema;
