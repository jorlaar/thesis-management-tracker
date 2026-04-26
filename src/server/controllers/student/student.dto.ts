import { Gender, StudentLevel } from '@app/data/student';

export interface StudentSignupDTO {
  dob?: Date;
  email?: string;
  // state?: string;
  gender?: Gender;
  password: string;
  last_name?: string;
  first_name?: string;
  matric_no?: string;
  department?: string;
  course?: string;
  level?: StudentLevel;
  faculty?: string;
}

export interface StudentLoginDTO {
  email: string;
  password: string;
}

export interface ChangeStudentPasswordDTO {
  old_password: string;
  new_password: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  email: string;
  password: string;
}

export interface ResetPasswordDTOV2 {
  email: string;
  otp: string;
  password: string;
}
