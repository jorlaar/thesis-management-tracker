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
