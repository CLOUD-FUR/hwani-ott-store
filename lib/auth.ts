import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export function generateToken(payload: any): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function generateVerifyCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateUniqueId(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

export function generateOrderNumber(userUniqueId: string, purchaseCount: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  let purchaseNumber = String(purchaseCount + 1);
  if (purchaseNumber.length < 3) {
    purchaseNumber = purchaseNumber.padStart(3, '0');
  }

  return `${year}${month}${day}${userUniqueId}${purchaseNumber}`;
}
