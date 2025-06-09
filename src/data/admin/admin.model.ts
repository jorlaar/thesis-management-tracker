import { Model } from '../base';

export interface IAdmin extends Model {
  id: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;

  // add auth_password change timestamp
  password_changed_at?: Date;

  updatePassword: (plainText: string) => Promise<IAdmin>;
  isPasswordValid: (plainText: string) => Promise<Boolean>;
}
