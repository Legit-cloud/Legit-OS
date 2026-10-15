import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  return apiKey ? new Resend(apiKey) : null;
}

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

/**
 * Dispatches an email using Resend if an API key is present.
 * If no key is configured (local development), logs cleanly to console.
 */
async function dispatchEmail(options: {
  to: string;
  subject: string;
  html: string;
  devLogContext?: string;
}) {
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'L.E.G.I.T Innovation Hub <onboarding@resend.dev>';

  if (resend) {
    try {
      console.log(`[RESEND] Sending email to: ${options.to} via ${fromEmail}`);
      const response = await resend.emails.send({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      if (response.error) {
        console.error(`[RESEND ERROR] Failed to send email to ${options.to}:`, response.error);
        return { success: false, error: response.error.message };
      }
      console.log(`[RESEND SUCCESS] Email dispatched to ${options.to}, ID: ${response.data?.id}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[RESEND EXCEPTION] Failed to send email to ${options.to}:`, err);
      return { success: false, error: err?.message || 'Unknown email error' };
    }
  }

  // Dev fallback when RESEND_API_KEY is not yet added
  console.log(`\n==================================================`);
  console.log(`✉️ [DEV EMAIL SIMULATION]`);
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  if (options.devLogContext) {
    console.log(`Context: ${options.devLogContext}`);
  }
  console.log(`==================================================\n`);
  return { success: true, devMode: true };
}

/**
 * Sends a 6-digit verification code to the member's email.
 */
export async function sendOtpEmail(email: string, code: string) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0b0f19; color: #f8fafc; border-radius: 16px;">
      <div style="margin-bottom: 24px;">
        <span style="display: inline-block; padding: 6px 12px; background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3); border-radius: 9999px; color: #22d3ee; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">
          L.E.G.I.T Innovation Hub
        </span>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0;">
        Verify your email address
      </h1>
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px 0;">
        Use the 6-digit verification code below to verify your email address and continue setting up your hub membership.
      </p>
      <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #22d3ee;">
          ${code}
        </span>
      </div>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 20px 0;">
        This code expires in <strong>10 minutes</strong>. If you did not request this verification, you can safely ignore this email.
      </p>
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; font-size: 11px; color: #475569;">
        L.E.G.I.T Innovation Hub · Co-working & Technology Hub · Ilorin, Nigeria
      </div>
    </div>
  `;

  return dispatchEmail({
    to: email,
    subject: `Your L.E.G.I.T Hub Verification Code: ${code}`,
    html,
    devLogContext: `VERIFICATION CODE: ${code} (Expires in 10 mins)`,
  });
}

/**
 * Notifies the member that their identity documentation has been submitted for review.
 */
export async function sendApplicationReceivedEmail(email: string, fullName: string) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0b0f19; color: #f8fafc; border-radius: 16px;">
      <div style="margin-bottom: 24px;">
        <span style="display: inline-block; padding: 6px 12px; background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3); border-radius: 9999px; color: #22d3ee; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">
          Application Under Review
        </span>
      </div>
      <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0;">
        We've received your verification documents, ${fullName}
      </h1>
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px 0;">
        Thank you for submitting your ID and face verification photo. Our hub administration team is reviewing your details to ensure facility security and member compliance.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px 0;">
        Verification reviews typically take between <strong>15 minutes to 2 hours</strong> during standard operating hours. You will receive an email as soon as your access is approved.
      </p>
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; font-size: 11px; color: #475569;">
        L.E.G.I.T Innovation Hub · Co-working & Technology Hub · Ilorin, Nigeria
      </div>
    </div>
  `;

  return dispatchEmail({
    to: email,
    subject: `Application Under Review · L.E.G.I.T Innovation Hub`,
    html,
    devLogContext: `Application received for ${fullName} (${email}) - Pending admin review.`,
  });
}

/**
 * Notifies the member that their account has been approved by admin.
 */
export async function sendApprovalEmail(email: string, fullName: string) {
  const loginUrl = `${clientOrigin}/login`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0b0f19; color: #f8fafc; border-radius: 16px;">
      <div style="margin-bottom: 24px;">
        <span style="display: inline-block; padding: 6px 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 9999px; color: #34d399; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">
          Account Approved
        </span>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0;">
        Welcome to L.E.G.I.T Hub, ${fullName}! 🎉
      </h1>
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px 0;">
        Your identity verification has been reviewed and approved by the hub administration team. Your L.E.G.I.T OS terminal is now fully active!
      </p>
      <div style="margin-bottom: 28px;">
        <a href="${loginUrl}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #06b6d4, #2563eb); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.35);">
          Sign in to your Terminal &rarr;
        </a>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0 0 20px 0;">
        You can now book co-working desks, reserve meeting suites, rent high-spec hardware, and enroll in Academy courses.
      </p>
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; font-size: 11px; color: #475569;">
        L.E.G.I.T Innovation Hub · Co-working & Technology Hub · Ilorin, Nigeria
      </div>
    </div>
  `;

  return dispatchEmail({
    to: email,
    subject: `Welcome to L.E.G.I.T Innovation Hub — Account Approved!`,
    html,
    devLogContext: `Account approved for ${fullName} (${email}).`,
  });
}

/**
 * Notifies the member if their identity verification was rejected.
 */
export async function sendRejectionEmail(email: string, fullName: string, reason: string) {
  const retryUrl = `${clientOrigin}/register`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0b0f19; color: #f8fafc; border-radius: 16px;">
      <div style="margin-bottom: 24px;">
        <span style="display: inline-block; padding: 6px 12px; background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 9999px; color: #fb7185; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">
          Verification Notice
        </span>
      </div>
      <h1 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0;">
        Verification Update for ${fullName}
      </h1>
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 16px 0;">
        Your identity documentation could not be approved at this time for the following reason:
      </p>
      <div style="background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.2); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="font-size: 14px; font-weight: 600; color: #fda4af; margin: 0;">
          ${reason || 'The uploaded document or face picture was unclear or did not match.'}
        </p>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px 0;">
        Please ensure your ID document is valid, unexpired, and clearly legible, and your face capture is taken in a well-lit environment.
      </p>
      <div style="margin-bottom: 28px;">
        <a href="${retryUrl}" style="display: inline-block; padding: 10px 24px; background: rgba(255, 255, 255, 0.1); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 13px; border-radius: 9999px;">
          Re-submit Verification &rarr;
        </a>
      </div>
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; font-size: 11px; color: #475569;">
        L.E.G.I.T Innovation Hub · Co-working & Technology Hub · Ilorin, Nigeria
      </div>
    </div>
  `;

  return dispatchEmail({
    to: email,
    subject: `Identity Verification Update · L.E.G.I.T Innovation Hub`,
    html,
    devLogContext: `Verification rejected for ${fullName} (${email}). Reason: ${reason}`,
  });
}
