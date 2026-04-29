export const __dummy = {};
export interface AdminLoginDTO {
  email?: string;
  password: string;
}

export interface AdminSignupDTO {
  email?: string;
  password: string;
  last_name?: string;
  first_name?: string;
}

export interface ChangeAdminPasswordDTO {
  old_password: string;
  new_password: string;
}

export interface ApproveAdminDTO {
  approvee_email: string;
  approver_email: string;
}
