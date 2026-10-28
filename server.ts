import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './server/routes.js';
import { getDatabase, getAllCertificates } from './server/db.js';
import { connectMongoDB, isMongoConnected, migrateSqliteToMongo } from './server/mongodb.js';
import { ensureMasterTemplateExists } from './server/pdfEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Helper to find local machine IPv4 address on Wi-Fi/LAN
function getLocalIPv4Address(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

// CORS middleware for LAN, cross-origin, and mobile device access
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Body and cookie parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Mount API routes
app.use('/api', apiRouter);

async function startServer() {
  try {
    // Initialize SQLite database and master template
    console.log('[Cosmogeek] Initializing databases and master PDF template...');
    await getDatabase();
    
    // Connect to MongoDB Atlas (Database: certificateDB, Collection: students)
    const mongoOk = await connectMongoDB();
    if (mongoOk) {
      // Sync any existing SQLite certificates to MongoDB Atlas students collection
      try {
        const { certificates } = await getAllCertificates({ limit: 1000 });
        if (certificates.length > 0) {
          await migrateSqliteToMongo(certificates);
        }
      } catch (err) {
        console.warn('[Cosmogeek] Initial migration notice:', err);
      }
    }

    await ensureMasterTemplateExists();
    console.log('[Cosmogeek] Database and master template initialized successfully.');

    if (!isProd) {
      // Development mode: attach Vite dev server middleware
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: {
          middlewareMode: true,
          host: '0.0.0.0',
        },
        appType: 'spa',
      });

      app.use(vite.middlewares);
    } else {
      // Production mode: serve built assets
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));

      app.get('*', (req, res) => {
        const configuredFrontend =
          process.env.APP_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.PUBLIC_BASE_URL ||
          process.env.FRONTEND_URL ||
          'https://certificate-qr-verifications.vercel.app';

        // Auto-redirect web requests (such as scanned QR /verify/... links) to Vercel
        if (req.path.startsWith('/verify') || req.path.startsWith('/admin') || !req.path.startsWith('/api')) {
          const targetUrl = `${configuredFrontend.replace(/\/$/, '')}${req.originalUrl}`;
          return res.redirect(302, targetUrl);
        }

        const indexPath = path.resolve(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(200).json({
            status: 'online',
            service: 'Cosmogeek Certificate QR API Backend',
            frontendUrl: configuredFrontend,
            message: 'Backend is running successfully! Frontend is hosted on Vercel.'
          });
        }
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      const localIp = getLocalIPv4Address();
      console.log(`[Cosmogeek] Server listening on network interface 0.0.0.0:${PORT}`);
      console.log(`  > Local:   http://localhost:${PORT}`);
      if (localIp) {
        console.log(`  > Network: http://${localIp}:${PORT} (Access from mobile on same Wi-Fi)`);
      }
      const configuredBase =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.PUBLIC_BASE_URL ||
        process.env.APP_URL;
      if (configuredBase) {
        console.log(`  > QR Verification Base URL: ${configuredBase}`);
      }
    });
  } catch (err) {
    console.error('[Cosmogeek] Fatal server initialization error:', err);
    process.exit(1);
  }
}

startServer();
