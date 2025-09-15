/**
 * Custom JWT utilities for enhanced security
 * Replaces default Supabase JWT handling with custom secret-based tokens
 */

import jwt from 'jsonwebtoken';

// Environment variables - these will be loaded from process.env in server context
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_ALGORITHM = process.env.JWT_ALGORITHM || 'HS256';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_ISSUER = process.env.JWT_ISSUER || 'booze-and-books-app';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for custom JWT authentication');
}

export interface CustomJWTPayload {
  userId: string;
  email: string;
  role: 'authenticated' | 'admin';
  iat?: number;
  exp?: number;
  iss?: string;
}

/**
 * Generate a custom JWT token with our secret
 */
export function generateCustomToken(payload: Omit<CustomJWTPayload, 'iat' | 'exp' | 'iss'>): string {
  const tokenPayload: CustomJWTPayload = {
    ...payload,
    iss: JWT_ISSUER,
  };

  const options: jwt.SignOptions = {
    algorithm: JWT_ALGORITHM as jwt.Algorithm,
    expiresIn: JWT_EXPIRES_IN,
  };

  return jwt.sign(tokenPayload, JWT_SECRET, options);
}

/**
 * Verify and decode a custom JWT token
 */
export function verifyCustomToken(token: string): CustomJWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM as jwt.Algorithm],
      issuer: JWT_ISSUER,
    }) as CustomJWTPayload;

    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Validate token and return user info
 */
export function validateAuthToken(authHeader: string | null): CustomJWTPayload | null {
  const token = extractTokenFromHeader(authHeader);
  if (!token) {
    return null;
  }
  return verifyCustomToken(token);
}

/**
 * Check if token is expired
 */
export function isTokenExpired(payload: CustomJWTPayload): boolean {
  if (!payload.exp) {
    return true;
  }
  return Date.now() >= payload.exp * 1000;
}

/**
 * Refresh token if it's close to expiring (within 1 hour)
 */
export function shouldRefreshToken(payload: CustomJWTPayload): boolean {
  if (!payload.exp) {
    return true;
  }
  const oneHourFromNow = Date.now() + (60 * 60 * 1000);
  return oneHourFromNow >= payload.exp * 1000;
}

/**
 * Create a secure session token for cookies
 */
export function createSessionToken(userId: string, email: string, role: 'authenticated' | 'admin' = 'authenticated'): string {
  return generateCustomToken({ userId, email, role });
}

/**
 * Validate session token from cookies
 */
export function validateSessionToken(token: string): { userId: string; email: string; role: string } | null {
  const payload = verifyCustomToken(token);
  if (!payload || isTokenExpired(payload)) {
    return null;
  }
  
  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  };
}
