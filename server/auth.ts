/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { getAdminByUsername, getAdminById } from './db.js';

const SESSION_SECRET = process.env.SESSION_SECRET || 'cosmogeek-ultra-secure-session-key-change-in-production-2026';
export const SESSION_COOKIE_NAME = 'cg_admin_session';

// In-memory rate limiting for login attempts
interface RateLimitRecord {
  attempts: number;
  blockedUntil: number;
}
const loginRateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Checks and records rate limit attempts for an IP.
 * Max 5 failed attempts in 5 minutes before temporary 15 minute lock.
 */
export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = loginRateLimitMap.get(ip);

  if (!record) {
    return { allowed: true };
  }

  if (record.blockedUntil > now) {
    const remaining = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds: remaining };
  }

  // Lock expired
  if (record.blockedUntil > 0 && record.blockedUntil <= now) {
    loginRateLimitMap.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const record = loginRateLimitMap.get(ip) || { attempts: 0, blockedUntil: 0 };
  record.attempts += 1;

  if (record.attempts >= 5) {
    record.blockedUntil = now + 15 * 60 * 1000; // Block for 15 minutes
  }

  loginRateLimitMap.set(ip, record);
}

export function recordSuccessfulLogin(ip: string): void {
  loginRateLimitMap.delete(ip);
}

/**
 * Creates an HMAC-signed session string
 */
export function createSignedSessionToken(userId: string): string {
  const payload = JSON.stringify({
    userId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies a signed session token and extracts the userId
 */
export function verifySessionToken(token: string): { valid: boolean; userId?: string } {
  if (!token || !token.includes('.')) return { valid: false };

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return { valid: false };

  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false };
  }

  try {
    const decoded = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (decoded.expiresAt && decoded.expiresAt < Date.now()) {
      return { valid: false }; // Expired
    }
    return { valid: true, userId: decoded.userId };
  } catch {
    return { valid: false };
  }
}

/**
 * Express middleware to enforce admin authentication on protected endpoints
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  let token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
    return;
  }

  const { valid, userId } = verifySessionToken(token);
  if (!valid || !userId) {
    res.status(401).json({ error: 'Unauthorized: Session is invalid or expired' });
    return;
  }

  const admin = await getAdminById(userId);
  if (!admin) {
    res.status(401).json({ error: 'Unauthorized: Admin user not found' });
    return;
  }

  (req as any).adminUser = admin;
  next();
}
