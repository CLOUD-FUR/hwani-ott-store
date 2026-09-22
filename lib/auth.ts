import crypto from 'crypto';
import { prisma } from './prisma';

const SESSION_SECRET = process.env.SESSION_SECRET || 'development-session-secret-change-in-production';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'development-admin-secret-change-in-production';

// Generate secure random tokens
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate 5-digit unique member ID (10000-99999)
export function generateUniqueId(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// Generate 6-digit verification code
export function generateVerifyCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate order number: YYYYMMDD + memberID + purchaseSequence
export function generateOrderNumber(memberUniqueId: string, purchaseCount: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  let purchaseNumber = String(purchaseCount + 1);
  if (purchaseNumber.length < 3) {
    purchaseNumber = purchaseNumber.padStart(3, '0');
  }

  return `${year}${month}${day}${memberUniqueId}${purchaseNumber}`;
}

// Session management
export async function createUserSession(userId: string): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function verifyUserSession(token: string): Promise<string | null> {
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      return null;
    }

    return session.userId;
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

export async function deleteUserSession(token: string): Promise<void> {
  try {
    await prisma.session.delete({ where: { token } });
  } catch (error) {
    console.error('Session deletion error:', error);
  }
}

// Admin session management
export async function createAdminSession(username: string): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.adminSession.create({
    data: {
      token,
      username,
      expiresAt,
    },
  });

  return token;
}

export async function verifyAdminSession(token: string): Promise<string | null> {
  try {
    const session = await prisma.adminSession.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.adminSession.delete({ where: { id: session.id } });
      }
      return null;
    }

    return session.username;
  } catch (error) {
    console.error('Admin session verification error:', error);
    return null;
  }
}

export async function deleteAdminSession(token: string): Promise<void> {
  try {
    await prisma.adminSession.delete({ where: { token } });
  } catch (error) {
    console.error('Admin session deletion error:', error);
  }
}

// Rate limiting
export async function checkRateLimit(key: string, maxAttempts: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    const existing = await prisma.rateLimit.findUnique({
      where: { key },
    });

    if (!existing) {
      await prisma.rateLimit.create({
        data: { key, count: 1, resetAt },
      });
      return true;
    }

    if (existing.resetAt < now) {
      await prisma.rateLimit.update({
        where: { key },
        data: { count: 1, resetAt },
      });
      return true;
    }

    if (existing.count >= maxAttempts) {
      return false;
    }

    await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return true; // Allow on error to avoid blocking legitimate users
  }
}

export async function getRateLimitRemaining(key: string): Promise<{ count: number; resetAt: Date } | null> {
  try {
    const limit = await prisma.rateLimit.findUnique({
      where: { key },
    });

    if (!limit || limit.resetAt < new Date()) {
      return null;
    }

    return { count: limit.count, resetAt: limit.resetAt };
  } catch (error) {
    console.error('Rate limit remaining check error:', error);
    return null;
  }
}
