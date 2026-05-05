export interface LecturerLoginDTO {
  email?: string;
  password: string;
}

export interface LecturerSignupDTO {
  email?: string;
  password: string;
  last_name?: string;
  first_name?: string;
  department?: string;
  faculty?: string;
}

export interface ChangeLecturerPasswordDTO {
  old_password: string;
  new_password: string;
}

export interface ApproveDTO {
  approvee_email: string;
  approving_admin_email: string;
}
