import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { publicUser, requireAuth, signToken } from '../lib/auth.js';
import { HttpError } from '../lib/http.js';
import { log } from '../lib/telemetry.js';
import { notify, notifyAdmins } from '../lib/realtime.js';
import { touchStreak } from '../lib/ledger.js';
import { sendOtpEmail, sendApplicationReceivedEmail } from '../lib/email.js';

export const authRouter: Router = Router();

const sendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
});

authRouter.post('/send-otp', async (req, res) => {
  const { email } = sendOtpSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && (existing.status as string) !== 'REJECTED') {
    throw new HttpError(409, 'An account with this email already exists. Please sign in instead.');
  }

  // Generate 6-digit numeric OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.emailOtp.upsert({
    where: { email },
    update: { code, expiresAt },
    create: { email, code, expiresAt },
  });

  const emailResult = await sendOtpEmail(email, code);
  if (!emailResult.success) {
    throw new HttpError(400, emailResult.error || 'Failed to send verification email');
  }

  res.json({
    ok: true,
    message: 'Verification code sent to your email',
  });
});

const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().length(6, 'Verification code must be 6 digits'),
});

authRouter.post('/verify-otp', async (req, res) => {
  const { email, code } = verifyOtpSchema.parse(req.body);
  const otpRecord = await prisma.emailOtp.findUnique({ where: { email } });

  if (!otpRecord) {
    throw new HttpError(400, 'No verification code found. Please request a new code.');
  }

  if (new Date() > otpRecord.expiresAt) {
    await prisma.emailOtp.delete({ where: { email } }).catch(() => {});
    throw new HttpError(400, 'Verification code has expired. Please request a new code.');
  }

  if (otpRecord.code !== code) {
    throw new HttpError(400, 'Invalid verification code. Please check and try again.');
  }

  // Code matches!
  await prisma.emailOtp.delete({ where: { email } }).catch(() => {});
  res.json({ ok: true, verified: true });
});

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  phone: z.string().trim().max(30).optional(),
  idDocument: z.string().min(1, 'Please upload a valid ID document'),
  idType: z.string().default('NIN'),
  facePicture: z.string().min(1, 'Please complete the live face capture'),
});

authRouter.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing && (existing.status as string) !== 'REJECTED') {
    throw new HttpError(409, 'An account with this email already exists');
  }

  let user;
  if (existing && (existing.status as string) === 'REJECTED') {
    user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        passwordHash: await bcrypt.hash(data.password, 10),
        idDocument: data.idDocument,
        idType: data.idType,
        facePicture: data.facePicture,
        status: 'PENDING_VERIFICATION',
        verified: false,
        verificationNote: null,
      } as any,
    });
  } else {
    user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        passwordHash: await bcrypt.hash(data.password, 10),
        idDocument: data.idDocument,
        idType: data.idType,
        facePicture: data.facePicture,
        status: 'PENDING_VERIFICATION',
        verified: false,
      } as any,
    });
  }

  // Dispatch Application Received email
  await sendApplicationReceivedEmail(user.email, user.fullName).catch((err) => {
    console.error('Failed to send application email:', err);
  });

  // Notify admins in real-time
  await notifyAdmins(
    'New Member Application Pending',
    `${user.fullName} (${user.email}) submitted ID & face photo for verification.`
  ).catch(() => {});

  await log('ADMIN', `New member registration submitted for review: ${user.fullName} <${user.email}>`, user.id);
  await touchStreak(user.id, null);

  res.status(201).json({
    token: signToken(user.id),
    user: publicUser(user),
    pendingVerification: true,
  });
});

const resubmitSchema = z.object({
  idDocument: z.string().min(1, 'Please upload a valid ID document'),
  idType: z.string().default('NIN'),
  facePicture: z.string().min(1, 'Please complete the live face capture'),
});

authRouter.post('/resubmit-verification', requireAuth, async (req, res) => {
  const data = resubmitSchema.parse(req.body);
  const u = req.user!;

  const updated = await prisma.user.update({
    where: { id: u.id },
    data: {
      idDocument: data.idDocument,
      idType: data.idType,
      facePicture: data.facePicture,
      status: 'PENDING_VERIFICATION',
      verified: false,
      verificationNote: null,
    } as any,
  });

  await sendApplicationReceivedEmail(updated.email, updated.fullName).catch((err) => {
    console.error('Failed to send application email:', err);
  });

  await notifyAdmins(
    'Member Application Re-submitted',
    `${updated.fullName} (${updated.email}) updated and re-submitted ID & face photo for verification.`
  ).catch(() => {});

  await log('ADMIN', `Member registration re-submitted for review: ${updated.fullName} <${updated.email}>`, updated.id);

  res.json({
    ok: true,
    user: publicUser(updated),
  });
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    await log('SECURITY', `Failed sign-in attempt for ${email}`);
    throw new HttpError(401, 'Invalid email or password');
  }
  const userStatus = user.status as string;
  if (userStatus !== 'ACTIVE') {
    await log('SECURITY', `Blocked sign-in for ${userStatus.toLowerCase()} account ${email}`, user.id);
    if (userStatus === 'PENDING_VERIFICATION') {
      throw new HttpError(403, 'Your identity verification is currently under review by hub administration. You will receive an email once approved.');
    }
    if (userStatus === 'REJECTED') {
      const note = (user as any).verificationNote || 'ID or face picture did not meet guidelines';
      throw new HttpError(403, `Your verification was rejected: ${note}. You can sign up again with updated documents.`);
    }
    throw new HttpError(403, `This account is ${userStatus.toLowerCase()}. Contact hello@legithub.com.`);
  }
  await log(user.role === 'ADMIN' ? 'ADMIN' : 'INFO', `${user.role === 'ADMIN' ? 'Admin' : 'Member'} session started: ${user.fullName}`, user.id);
  res.json({ token: signToken(user.id), user: publicUser(user) });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  await touchStreak(req.user!.id, req.user!.lastActiveAt);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', requireAuth, async (req, res) => {
  const u = req.user!;
  await log(
    u.role === 'ADMIN' ? 'ADMIN' : 'INFO',
    u.role === 'ADMIN' ? `Admin session terminated: ${u.fullName}` : `Member session ended: ${u.fullName}`,
    u.id,
  );
  res.json({ ok: true });
});
