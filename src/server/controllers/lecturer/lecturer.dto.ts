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
