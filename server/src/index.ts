import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ZodError } from 'zod';
import multer from 'multer';
import { env } from './lib/env.js';
import { requireAdmin, requireAuth } from './lib/auth.js';
import { HttpError } from './lib/http.js';
import { setIo } from './lib/realtime.js';
import { log } from './lib/telemetry.js';
import { setupSocket } from './socket.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';
import { hubRouter } from './routes/hub.js';
import { academyRouter } from './routes/academy.js';
import { financeRouter, UPLOAD_DIR } from './routes/finance.js';
import { communityRouter } from './routes/community.js';
import { transitRouter } from './routes/transit.js';
import { adminRouter } from './routes/admin.js';
import { startAssetTrackingAgent } from './workers/assetTracker.js';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => void res.json({ status: 'SYSTEM ONLINE', time: new Date().toISOString() }));
app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/admin', requireAuth, requireAdmin, adminRouter);
app.use('/api', requireAuth, hubRouter, academyRouter, financeRouter, communityRouter, transitRouter);
app.use('/api', (_req, res) => void res.status(404).json({ error: 'Endpoint not found' }));

// In production the API also serves the built client.
const clientDist = path.resolve(import.meta.dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return void res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid input', issues: err.issues });
  }
  if (err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
  if (err instanceof multer.MulterError) {
    return void res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File must be under 5MB' : err.message });
  }
  if ((err as { code?: string })?.code === 'P2025') return void res.status(404).json({ error: 'Record not found' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side' });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: env.clientOrigin } });

if (env.redisUrl) {
  const pubClient = createClient({ url: env.redisUrl });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Redis adapter for Socket.io enabled.');
  }).catch(console.error);
}

setIo(io);
setupSocket(io);


server.listen(env.port, () => {
  console.log(`L.E.G.I.T Hub API listening on http://localhost:${env.port}`);
  void log('INFO', 'Hub API online');
  startAssetTrackingAgent({ heartbeatIntervalMs: 15_000, defaultMaxCapacity: 10, stalePendingHours: 24 });
});
