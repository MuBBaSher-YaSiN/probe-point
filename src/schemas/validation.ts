import { z } from 'zod';

// Performance Test Form Schema
export const testFormSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .url('Please enter a valid URL')
    .refine((url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    }, 'URL must use HTTP or HTTPS protocol'),
  device: z.enum(['mobile', 'desktop']),
  region: z.string().min(1, 'Please select a region')
});

// Admin Login Schema
export const adminLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
});

// User Registration Schema
export const registrationSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(50, 'Full name must be less than 50 characters')
    .optional()
});

// Profile Update Schema
export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(50, 'Full name must be less than 50 characters')
    .optional(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional()
});

// Password Change Schema
export const passwordChangeSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// API Key Generate Schema
export const apiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'API key name is required')
    .max(50, 'Name must be less than 50 characters'),
  description: z
    .string()
    .max(200, 'Description must be less than 200 characters')
    .optional()
});

// Search/Filter Schema
export const searchFilterSchema = z.object({
  search: z.string().optional(),
  device: z.enum(['all', 'mobile', 'desktop']).optional(),
  status: z.enum(['all', 'completed', 'running', 'failed']).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  sortBy: z.enum(['created_at', 'performance_score', 'url']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
});

// Export Schema
export const exportSchema = z.object({
  format: z.enum(['pdf', 'csv']),
  testIds: z.array(z.string()).min(1, 'Please select at least one test to export'),
  includeRecommendations: z.boolean().optional()
});

// Rate Limiting Schema
export const rateLimitSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  action: z.enum(['test', 'export', 'api']),
  timestamp: z.date()
});

export type TestFormData = z.infer<typeof testFormSchema>;
export type AdminLoginData = z.infer<typeof adminLoginSchema>;
export type RegistrationData = z.infer<typeof registrationSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeData = z.infer<typeof passwordChangeSchema>;
export type ApiKeyData = z.infer<typeof apiKeySchema>;
export type SearchFilterData = z.infer<typeof searchFilterSchema>;
export type ExportData = z.infer<typeof exportSchema>;
export type RateLimitData = z.infer<typeof rateLimitSchema>;