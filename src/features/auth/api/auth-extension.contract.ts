import { Staff } from '@/entities/staff';

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface UpdateProfileDto {
  name: string;
  avatarUrl?: string | null;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface IAuthExtensionRepository {
  forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }>;
  resetPassword(dto: ResetPasswordDto): Promise<{ message: string }>;
  updateProfile(staffId: string, dto: UpdateProfileDto): Promise<Staff>;
  changePassword(staffId: string, dto: ChangePasswordDto): Promise<{ message: string }>;
}
