export interface MethodologyLoginDTO {
  email?: string;
  password: string;
}

export interface MethodologySignupDTO {
  email?: string;
  password: string;
  last_name?: string;
  first_name?: string;
  department?: string;
  faculty?: string;
}

export interface ChangeMethodologyPasswordDTO {
  old_password: string;
  new_password: string;
}
