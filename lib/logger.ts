import { Prisma, LogType } from '@prisma/client';
import { prisma } from './prisma';

interface CreateLogParams {
  type: LogType;
  userId?: string;
  email?: string;
  action: string;
  details?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export async function createLog(params: CreateLogParams) {
  try {
    await prisma.log.create({
      data: {
        type: params.type,
        userId: params.userId,
        email: params.email,
        action: params.action,
        details: params.details || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error('Log creation error:', error);
  }
}
