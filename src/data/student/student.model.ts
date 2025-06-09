import { Model } from '../base';

export interface IStudentModel extends Model {
  id: string;
  dob: Date;
  matric_no: string;
  gender: Gender;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  course: string;
  level: StudentLevel;
  faculty: string;

  // add auth_password change timestamp
  password_changed_at?: Date;

  updatePassword: (plainText: string) => Promise<IStudentModel>;
  isPasswordValid: (plainText: string) => Promise<Boolean>;
}

export type Gender = 'male' | 'female';

// Enums
export enum StudentLevel {
  MASTERS = 'masters',
  DOCTORATE = 'doctorate',
  MPHIL = 'mphil'
}
