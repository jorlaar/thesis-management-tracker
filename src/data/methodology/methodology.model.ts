import { Model } from '../base';
import { IAdmin } from '../admin/admin.model';

export interface IMethodology extends Model {
  id: string;
  password: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  department: string;
  faculty: string;
  is_approved: boolean;
  approved_at: Date;
  approved_by: IAdmin['id'] | null;

  // add auth_password change timestamp
  password_changed_at?: Date;

  updatePassword: (plainText: string) => Promise<IMethodology>;
  isPasswordValid: (plainText: string) => Promise<Boolean>;
}
