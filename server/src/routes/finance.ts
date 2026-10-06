import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { BANK_DETAILS, PRO_MONTHLY_PRICE } from '../lib/env.js';
import { badRequest, HttpError, notFound } from '../lib/http.js';
import { log } from '../lib/telemetry.js';
import { emitToAdmins } from '../lib/realtime.js';

export const UPLOAD_DIR = path.resolve(import.meta.dirname, '../../uploads');

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') cb(null, true);
    else cb(new HttpError(400, 'Receipt must be an image or PDF'));
  },
});

export const financeRouter = Router();

financeRouter.get('/finance', async (req, res) => {
  const userId = req.user!.id;
  const [invoices, proofs] = await Promise.all([
    prisma.invoice.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.paymentProof.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { invoice: { select: { description: true } } },
    }),
  ]);
  res.json({
    bank: BANK_DETAILS,
    plan: { tier: req.user!.tier, renewsAt: req.user!.planRenewsAt, proPrice: PRO_MONTHLY_PRICE },
    invoices,
    proofs: proofs.map(({ receiptUrl: _hidden, ...p }) => p),
  });
});

financeRouter.post('/finance/subscribe', async (req, res) => {
  z.object({ tier: z.literal('PRO_MONTHLY') }).parse(req.body);
  const userId = req.user!.id;
  const open = await prisma.invoice.findFirst({
    where: { userId, kind: 'SUBSCRIPTION', status: { in: ['PENDING', 'AWAITING_REVIEW'] } },
  });
  if (open) return void res.json(open);
  const invoice = await prisma.invoice.create({
    data: { userId, kind: 'SUBSCRIPTION', refId: 'PRO_MONTHLY', amount: PRO_MONTHLY_PRICE, description: 'Pro Membership (1 month)' },
  });
  await log('INFO', `${req.user!.fullName} requested Pro Membership upgrade`, userId);
  res.status(201).json(invoice);
});

financeRouter.post('/finance/proofs', upload.single('receipt'), async (req, res) => {
  if (!req.file) throw badRequest('Attach your bank receipt');
  const data = z
    .object({
      amount: z.coerce.number().positive('Enter the amount you transferred').max(100_000_000),
      invoiceId: z.string().optional().transform((v) => v || undefined),
      note: z.string().trim().max(300).optional(),
    })
    .parse(req.body);
  const userId = req.user!.id;

  if (data.invoiceId) {
    const invoice = await prisma.invoice.findFirst({ where: { id: data.invoiceId, userId } });
    if (!invoice) throw notFound('Invoice');
    if (invoice.status !== 'PENDING') throw badRequest(`Invoice is ${invoice.status.toLowerCase().replace('_', ' ')}`);
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'AWAITING_REVIEW' } });
  }

  const proof = await prisma.paymentProof.create({
    data: { userId, invoiceId: data.invoiceId, amount: data.amount, note: data.note, receiptUrl: req.file.filename },
  });
  await log('INFO', `Payment proof submitted by ${req.user!.fullName}: ₦${data.amount.toLocaleString()}`, userId);
  emitToAdmins('queue:changed', null);
  const { receiptUrl: _hidden, ...rest } = proof;
  res.status(201).json(rest);
});
