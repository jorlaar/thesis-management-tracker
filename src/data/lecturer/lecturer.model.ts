import { IAdmin } from '../admin/admin.model';
import { Model } from '../base';

export interface ILecturerModel extends Model {
  id: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  faculty: string;
  is_approved: boolean;
  approved_at: Date;
  approved_by: IAdmin['id'] | null;

  // add auth_password change timestamp
  password_changed_at?: Date;

  updatePassword: (plainText: string) => Promise<ILecturerModel>;
  isPasswordValid: (plainText: string) => Promise<Boolean>;
}
