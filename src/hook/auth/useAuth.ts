import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

import { authApi } from '@/services/auth';

export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\dA-Za-z]).+$/,
      'Password must contain uppercase, lowercase, number and special character',
    ),
  referenceCode: z.string().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export function useAuth() {
  const loginMutation = useMutation({
    mutationFn: authApi.login,
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
  });

  const loginSocialMutation = useMutation({
    mutationFn: authApi.loginSocial,
  });

  return { loginMutation, registerMutation, loginSocialMutation };
}

