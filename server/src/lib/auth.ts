import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import { prisma } from './prisma.js';
import { env } from './env.js';
import { HttpError } from './http.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: '7d' });
}

/** Resolves a JWT to an active user, or throws a 401/403 HttpError. */
export async function userFromToken(token: string | undefined): Promise<User> {
  if (!token) throw new HttpError(401, 'Authentication required');
  let sub: string;
  try {
    sub = (jwt.verify(token, env.jwtSecret) as jwt.JwtPayload).sub as string;
  } catch {
    throw new HttpError(401, 'Session expired, please sign in again');
  }
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user) throw new HttpError(401, 'Account no longer exists');
  if (user.status !== 'ACTIVE') throw new HttpError(403, `Account ${user.status.toLowerCase()}`);
  return user;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  req.user = await userFromToken(header?.startsWith('Bearer ') ? header.slice(7) : undefined);
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') throw new HttpError(403, 'Admin access only');
  next();
}

/** Strips secrets before a user leaves the server. */
export function publicUser(user: User) {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}
