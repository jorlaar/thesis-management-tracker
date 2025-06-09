import { Model } from '../base';

export interface IMethodology extends Model {
  id: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  faculty: string;

  // add transaction_pin change timestamp
  password_changed_at?: Date;

  updatePassword: (plainText: string) => Promise<IMethodology>;
  isPasswordValid: (plainText: string) => Promise<Boolean>;
}
