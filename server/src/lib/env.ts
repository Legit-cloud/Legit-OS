import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
};

export const BANK_DETAILS = {
  bankName: 'The Alternative Bank Limited',
  accountName: 'L.E.G.I.T Innovation Hub',
  accountNumber: '0513670997',
};

export const PRO_MONTHLY_PRICE = 60000;
