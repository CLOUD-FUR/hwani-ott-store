import nodemailer, { type Transporter } from 'nodemailer';
import { prisma } from './prisma';

let transporter: Transporter | null = null;
let senderEmail: string | undefined;

function userFromEnvironment() {
  return process.env.SMTP_USER || 'no-reply@example.com';
}

// 이메일 발송 기록을 email_logs 테이블에 저장
async function logEmail(
  recipient: string,
  subject: string,
  template: string,
  ok: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        recipient,
        subject: subject.slice(0, 300),
        template,
        status: ok ? 'sent' : 'failed',
        error: ok ? null : (errorMessage ?? '알 수 없는 오류').slice(0, 1000),
      },
    });
  } catch (logError) {
    console.error('Email log creation error:', logError);
  }
}

async function getTransporter() {
  if (transporter) return transporter;

  const settings = await prisma.settings.findUnique({
    where: { id: 'settings' },
  });

  const host = settings?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = settings?.smtpPort || parseInt(process.env.SMTP_PORT || '587');
  const user = settings?.smtpUser || process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD; // Always from env, never from DB

  if (!user || !pass) {
    console.warn('SMTP credentials not configured. Emails will not be sent.');
    return null;
  }

  senderEmail = user;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const transport = await getTransporter();
  if (!transport) {
    throw new Error('SMTP not configured');
  }

  const settings = await prisma.settings.findUnique({
    where: { id: 'settings' },
  });

  const siteName = settings?.siteName || '화니 OTT';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>이메일 인증</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${siteName}</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">이메일 인증</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px; color: #334155; font-size: 16px; line-height: 1.6;">
                회원가입을 환영합니다! 아래 인증 코드를 입력하여 이메일 인증을 완료해주세요.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 24px; background-color: #f1f5f9; border-radius: 12px;">
                    <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">
                      ${code}
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                이 인증 코드는 <strong style="color: #334155;">10분간</strong> 유효합니다.<br>
                본인이 요청하지 않은 경우, 이 이메일을 무시하셔도 됩니다.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e2e8f0; background-color: #f8fafc; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                © 2026 ${siteName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const subject = `[${siteName}] 이메일 인증 코드`;

  try {
    await transport.sendMail({
      from: `"${siteName}" <${senderEmail || userFromEnvironment()}>`,
      to: email,
      subject,
      html,
    });
    await logEmail(email, subject, 'verification', true);
  } catch (error) {
    await logEmail(email, subject, 'verification', false, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function sendOrderConfirmationEmail(
  email: string,
  orderNumber: string,
  orderData: {
    totalAmount: number;
    items: Array<{ productName?: string; optionName?: string; quantity: number; price: number }>;
    accountInfo?: { bankName: string; bankAccount: string; accountHolder: string };
  }
): Promise<void> {
  const transport = await getTransporter();
  if (!transport) {
    console.warn('SMTP not configured. Order confirmation email not sent.');
    return;
  }

  const settings = await prisma.settings.findUnique({
    where: { id: 'settings' },
  });

  const siteName = settings?.siteName || '화니 OTT';
  const channelTalkUrl = settings?.channelTalkUrl;

  const itemsHtml = orderData.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">
        ${item.productName || '상품'}${item.optionName ? ` - ${item.optionName}` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: center;">
        ${item.quantity}개
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: right; font-weight: 600;">
        ${(item.price * item.quantity).toLocaleString()}원
      </td>
    </tr>
  `
    )
    .join('');

  const accountInfoHtml = orderData.accountInfo
    ? `
    <tr>
      <td style="padding: 24px 40px;">
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px;">
          <p style="margin: 0 0 12px; color: #92400e; font-size: 15px; font-weight: 600;">💰 입금 정보</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="color: #78350f; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0;">은행</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 600;">${orderData.accountInfo.bankName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">계좌번호</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 600; font-family: 'Courier New', monospace;">${orderData.accountInfo.bankAccount}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">예금주</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 600;">${orderData.accountInfo.accountHolder}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0 4px; font-weight: 600;">입금 금액</td>
              <td style="padding: 12px 0 4px; text-align: right; font-weight: 700; font-size: 18px; color: #f59e0b;">${orderData.totalAmount.toLocaleString()}원</td>
            </tr>
          </table>
        </div>
      </td>
    </tr>
  `
    : '';

  const channelTalkHtml = channelTalkUrl
    ? `
    <tr>
      <td style="padding: 0 40px 24px;">
        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            💬 입금 후 <strong>주문번호 ${orderNumber}</strong>를 채널톡으로 보내주세요!
          </p>
        </div>
      </td>
    </tr>
  `
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>주문 확인</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${siteName}</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">주문이 접수되었습니다</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">주문번호</p>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: #667eea; font-family: 'Courier New', monospace; letter-spacing: 2px;">
                  ${orderNumber}
                </p>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid #e2e8f0; margin-top: 24px;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 12px; text-align: left; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">상품</th>
                    <th style="padding: 12px; text-align: center; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">수량</th>
                    <th style="padding: 12px; text-align: right; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">금액</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr>
                    <td colspan="2" style="padding: 16px 12px; font-weight: 600; color: #0f172a; font-size: 16px;">총 결제 금액</td>
                    <td style="padding: 16px 12px; text-align: right; font-weight: 700; color: #667eea; font-size: 20px;">${orderData.totalAmount.toLocaleString()}원</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          ${accountInfoHtml}
          ${channelTalkHtml}
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e2e8f0; background-color: #f8fafc;">
              <p style="margin: 0 0 8px; color: #334155; font-size: 13px; line-height: 1.6;">
                주문이 정상적으로 접수되었습니다. 입금 확인 후 처리됩니다.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                문의사항이 있으시면 언제든 연락주세요.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; text-align: center; background-color: #f1f5f9;">
              <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                © 2026 ${siteName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const subject = `[${siteName}] 주문이 접수되었습니다 (${orderNumber})`;

  try {
    await transport.sendMail({
      from: `"${siteName}" <${senderEmail || userFromEnvironment()}>`,
      to: email,
      subject,
      html,
    });
    await logEmail(email, subject, 'order_confirmation', true);
  } catch (error) {
    await logEmail(email, subject, 'order_confirmation', false, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function sendOrderStatusEmail(
  email: string,
  orderNumber: string,
  status: string,
  message?: string
): Promise<void> {
  const transport = await getTransporter();
  if (!transport) {
    console.warn('SMTP not configured. Order status email not sent.');
    return;
  }

  const settings = await prisma.settings.findUnique({
    where: { id: 'settings' },
  });

  const siteName = settings?.siteName || '화니 OTT';

  const statusTitles: Record<string, string> = {
    APPROVED: '입금이 확인되었습니다',
    REJECTED: '주문이 거부되었습니다',
    COMPLETED: '주문이 완료되었습니다',
    CANCELLED: '주문이 취소되었습니다',
  };

  const statusColors: Record<string, string> = {
    APPROVED: '#10b981',
    REJECTED: '#ef4444',
    COMPLETED: '#3b82f6',
    CANCELLED: '#6b7280',
  };

  const statusTitle = statusTitles[status] || '주문 상태가 변경되었습니다';
  const statusColor = statusColors[status] || '#667eea';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>주문 상태 변경</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${siteName}</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">${statusTitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">주문번호</p>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${statusColor}; font-family: 'Courier New', monospace; letter-spacing: 2px;">
                  ${orderNumber}
                </p>
              </div>
              ${
                message
                  ? `
              <div style="background-color: #f1f5f9; border-left: 4px solid ${statusColor}; padding: 16px; border-radius: 8px; margin-top: 24px;">
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6;">
                  ${message}
                </p>
              </div>
              `
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e2e8f0; background-color: #f8fafc;">
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                문의사항이 있으시면 언제든 연락주세요.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; text-align: center; background-color: #f1f5f9;">
              <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                © 2026 ${siteName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const subject = `[${siteName}] ${statusTitle} (${orderNumber})`;

  try {
    await transport.sendMail({
      from: `"${siteName}" <${senderEmail || userFromEnvironment()}>`,
      to: email,
      subject,
      html,
    });
    await logEmail(email, subject, 'order_status', true);
  } catch (error) {
    await logEmail(email, subject, 'order_status', false, error instanceof Error ? error.message : String(error));
    throw error;
  }
}
