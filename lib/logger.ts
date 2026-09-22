import { prisma } from '@/lib/prisma';

export interface LogData {
  type: 'access' | 'signup' | 'verify' | 'purchase' | 'admin' | 'order' | 'payment' | 'product' | 'user';
  userId?: string;
  email?: string;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function createLog(data: LogData) {
  try {
    await prisma.log.create({
      data: {
        type: data.type,
        userId: data.userId,
        email: data.email,
        action: data.action,
        details: data.details ? JSON.stringify(data.details) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    console.error('Log creation error:', error);
  }
}
