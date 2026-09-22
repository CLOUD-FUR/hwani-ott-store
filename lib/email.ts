import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

let transporter: any = null;

export async function getEmailTransporter() {
  if (transporter) {
    return transporter;
  }

  const settings = await prisma.settings.findUnique({
    where: { id: 'settings' },
  });

  if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPassword) {
    throw new Error('이메일 설정이 완료되지 않았습니다.');
  }

  transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort || 587,
    secure: settings.smtpPort === 465,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPassword,
    },
  });

  return transporter;
}

export async function sendVerificationEmail(email: string, code: string) {
  const transporter = await getEmailTransporter();

  const mailOptions = {
    from: `"화니 OTT" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '[화니 OTT] 이메일 인증 코드',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0F172A;">이메일 인증</h2>
        <p>안녕하세요,</p>
        <p>화니 OTT 회원가입을 위한 인증 코드입니다.</p>
        <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #38BDF8; text-align: center; margin: 0; font-size: 32px; letter-spacing: 4px;">${code}</h1>
        </div>
        <p>위 코드를 입력하여 회원가입을 완료해주세요.</p>
        <p>이 코드는 10분 후 만료됩니다.</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
        <p style="color: #64748B; font-size: 12px;">
          본인이 요청하지 않은 경우, 이 이메일을 무시하셔도 됩니다.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendPasswordResetEmail(email: string, code: string) {
  const transporter = await getEmailTransporter();

  const mailOptions = {
    from: `"화니 OTT" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '[화니 OTT] 비밀번호 재설정',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0F172A;">비밀번호 재설정</h2>
        <p>안녕하세요,</p>
        <p>비밀번호 재설정을 위한 인증 코드입니다.</p>
        <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #38BDF8; text-align: center; margin: 0; font-size: 32px; letter-spacing: 4px;">${code}</h1>
        </div>
        <p>위 코드를 입력하여 새로운 비밀번호를 설정해주세요.</p>
        <p>이 코드는 10분 후 만료됩니다.</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
        <p style="color: #64748B; font-size: 12px;">
          본인이 요청하지 않은 경우, 즉시 고객센터로 문의해주세요.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendOrderConfirmationEmail(
  email: string,
  orderNumber: string,
  orderData: any
) {
  const transporter = await getEmailTransporter();

  const itemsHtml = orderData.items
    .map(
      (item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${item.productName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${item.quantity}개</td>
        <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right;">${item.price.toLocaleString()}원</td>
      </tr>
    `
    )
    .join('');

  const mailOptions = {
    from: `"화니 OTT" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `[화니 OTT] 주문이 접수되었습니다 (${orderNumber})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0F172A;">주문 접수 확인</h2>
        <p>주문이 정상적으로 접수되었습니다.</p>

        <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>주문번호:</strong> ${orderNumber}</p>
          <p><strong>주문일시:</strong> ${new Date(orderData.createdAt).toLocaleString('ko-KR')}</p>
        </div>

        <h3 style="color: #0F172A; margin-top: 30px;">주문 내역</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #F1F5F9;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #CBD5E1;">상품명</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #CBD5E1;">수량</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #CBD5E1;">금액</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #0F172A;">
          <p style="font-size: 18px; color: #0F172A;">
            <strong>총 결제금액: ${orderData.totalAmount.toLocaleString()}원</strong>
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
        <p style="color: #64748B; font-size: 12px;">
          주문 관련 문의사항은 마이페이지에서 확인하실 수 있습니다.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendOrderStatusEmail(
  email: string,
  orderNumber: string,
  status: string,
  deliveryInfo?: any
) {
  const transporter = await getEmailTransporter();

  const statusText: Record<string, string> = {
    pending: '주문 접수',
    processing: '처리 중',
    completed: '완료',
    cancelled: '취소',
  };

  let contentHtml = `<p>주문 상태가 <strong>${statusText[status] || status}</strong>로 변경되었습니다.</p>`;

  if (deliveryInfo) {
    contentHtml += `
      <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #0F172A; margin-top: 0;">배송 정보</h3>
        <p>${deliveryInfo}</p>
      </div>
    `;
  }

  const mailOptions = {
    from: `"화니 OTT" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `[화니 OTT] 주문 상태 변경 알림 (${orderNumber})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0F172A;">주문 상태 변경</h2>
        <p><strong>주문번호:</strong> ${orderNumber}</p>
        ${contentHtml}
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
        <p style="color: #64748B; font-size: 12px;">
          자세한 내용은 마이페이지에서 확인하실 수 있습니다.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
