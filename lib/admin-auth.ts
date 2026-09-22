import { cookies } from 'next/headers';
import { verifyAdminSession } from './auth';

export async function getAdminUsername(): Promise<string | null> {
  const token = (await cookies()).get('admin_session')?.value;
  return token ? verifyAdminSession(token) : null;
}
