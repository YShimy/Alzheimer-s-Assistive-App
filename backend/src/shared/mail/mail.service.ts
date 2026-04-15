import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../logger/logger.js';

/** Reusable SMTP transporter — created lazily on first use. */
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      logger.warn('SMTP credentials not configured — emails will not be sent.');
      // Create a no-op transport for development that logs to console
      transporter = nodemailer.createTransport({
        jsonTransport: true, // emails are logged as JSON instead of sent
      });
    } else {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }
  return transporter;
}

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends an email using the configured SMTP transport.
 * Fails safely — logs errors but does not throw.
 * Returns true if the email was sent successfully, false otherwise.
 */
export async function sendMail(options: SendMailOptions): Promise<boolean> {
  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: `"Cognitive Support" <${env.MAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (!env.SMTP_USER || !env.SMTP_PASS) {
      // In dev mode without SMTP, log the email content
      logger.info({ to: options.to, subject: options.subject }, 'Email (dev mode — not sent via SMTP)');
      try {
        const parsed = JSON.parse(info.message);
        logger.info({ html: parsed.html?.substring(0, 200) }, 'Email content preview');
      } catch {
        // ignore parse errors
      }
    } else {
      logger.info({ messageId: info.messageId, to: options.to }, 'Email sent successfully');
    }

    return true;
  } catch (err) {
    logger.error({ err, to: options.to }, 'Failed to send email');
    return false;
  }
}

/**
 * Sends a verification code email for signup.
 */
export async function sendVerificationCodeEmail(
  to: string,
  code: string,
  expiresInMinutes: number = 10,
): Promise<boolean> {
  const subject = 'Your Verification Code — Cognitive Support';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9f9f7; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 16px; padding: 40px 32px; }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo-circle { display: inline-block; width: 56px; height: 56px; border-radius: 50%; background: #bae3f8; line-height: 56px; font-size: 28px; }
    h1 { color: #2f3332; font-size: 22px; text-align: center; margin-bottom: 8px; font-weight: 600; }
    .subtitle { color: #5c605e; font-size: 15px; text-align: center; margin-bottom: 32px; }
    .code-box { background: #f3f4f2; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; }
    .code { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #3d6476; font-family: monospace; }
    .expires { color: #777c79; font-size: 13px; text-align: center; margin-bottom: 32px; }
    .ignore { color: #afb3b0; font-size: 12px; text-align: center; line-height: 1.5; border-top: 1px solid #eceeec; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><div class="logo-circle">❤️</div></div>
    <h1>Verification Code</h1>
    <p class="subtitle">Enter this code in the app to verify your email address.</p>
    <div class="code-box">
      <div class="code">${code}</div>
    </div>
    <p class="expires">This code expires in ${expiresInMinutes} minutes.</p>
    <p class="ignore">If you did not request this code, you can safely ignore this email. No account will be created.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `Your verification code is: ${code}\n\nThis code expires in ${expiresInMinutes} minutes.\n\nIf you did not request this, please ignore this email.`;

  return sendMail({ to, subject, html, text });
}
