/**
 * File-based Admin Configuration for ProbePoint
 * 
 * This file defines superadmin credentials that are checked at runtime.
 * No database record is created - authentication is purely file-based.
 * 
 * To generate a password hash:
 * 1. Install bcrypt: npm install bcrypt @types/bcrypt
 * 2. Run: node -e "console.log(require('bcrypt').hashSync('your-password', 10))"
 * 
 * Or use online bcrypt generator with cost factor 10.
 * 
 * Environment variables (recommended):
 * - ADMIN_EMAIL: The superadmin email address
 * - ADMIN_PASSWORD_HASH: The bcrypt hash of the admin password
 */

export const ADMIN = {
  EMAIL: process.env.ADMIN_EMAIL ?? "iqraf2001@gmail.com",
  PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH ?? "$2a$10$2iduKnlMUlyrzmK0gas3AuERHsd4yBfZGw4BnPYWl.qc4deAo1l9O", // Default: "password"
} as const;

/**
 * Check if the provided credentials match the admin configuration
 */
export async function validateAdminCredentials(email: string, password: string): Promise<boolean> {
  if (email !== ADMIN.EMAIL) {
    return false;
  }

  // Import bcrypt dynamically to avoid bundling issues
  try {
    const bcrypt = await import('bcrypt');
    return await bcrypt.compare(password, ADMIN.PASSWORD_HASH);
  } catch (error) {
    console.error('Failed to validate admin credentials:', error);
    return false;
  }
}

/**
 * Check if the provided email is the admin email
 */
export function isAdminEmail(email: string): boolean {
  return email === ADMIN.EMAIL;
}

/**
 * Admin role configuration
 */
export const ADMIN_ROLE = {
  PERMISSIONS: [
    'manage_users',
    'view_analytics', 
    'manage_reports',
    'configure_settings',
    'view_audit_logs',
    'manage_api_keys',
    'system_maintenance'
  ],
  LEVEL: 'superadmin'
} as const;

export type AdminPermission = typeof ADMIN_ROLE.PERMISSIONS[number];
