import { Model } from '../base';

export interface IAdmin extends Model {
  id: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  role: AdminRole;
  is_approved: boolean;
  approved_at: Date;
  approved_by: IAdmin['id'] | null;

  // add auth_password change timestamp
  password_changed_at?: Date;

  updatePassword: (plainText: string) => Promise<IAdmin>;
  isPasswordValid: (plainText: string) => Promise<Boolean>;
}

export enum AdminRole {
  ROOT = 'root',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

// Assign numeric ranks (Higher = More Power)
export const AdminTier: Record<AdminRole, number> = {
  [AdminRole.ROOT]: 3,
  [AdminRole.SUPER_ADMIN]: 2,
  [AdminRole.ADMIN]: 1
};
