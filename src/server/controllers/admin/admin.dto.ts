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
