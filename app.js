import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

import connectDB from './src/config/db.js';
import swaggerSetup from './src/config/swagger.js';

// Route imports
import authRoutes from './src/routes/auth.routes.js';
import vehicleRoutes from './src/routes/vehicle.routes.js';
import locationRoutes from './src/routes/location.routes.js';
import provinceRoutes from './src/routes/province.routes.js';
import districtRoutes from './src/routes/district.routes.js';
import stationRoutes from './src/routes/station.routes.js';
import driverRoutes from './src/routes/driver.routes.js';

// Error handler
import errorHandler from './src/middleware/errorHandler.js';

const app = express();

// Render injects PORT dynamically — always use process.env.PORT
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// ─── Security Middleware ───────────────────────────────────────────
app.use(helmet());

// Fix: correctly handle ALLOWED_ORIGINS — support "*" and comma-separated list
const rawOrigins = process.env.ALLOWED_ORIGINS || '*';
const corsOrigin = rawOrigins === '*' ? '*' : rawOrigins.split(',').map((o) => o.trim());

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ─────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ─── General Middleware ────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Swagger Docs ──────────────────────────────────────────────────
swaggerSetup(app);

// ─── Health Check ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const used = process.memoryUsage();
  res.status(200).json({
    success: true,
    message: 'Tuk-Tuk Tracker API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(process.uptime())}s`,
    memory: {
      rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
    },
  });
});

// ─── API Routes ────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/provinces', provinceRoutes);
app.use('/api/v1/districts', districtRoutes);
app.use('/api/v1/stations', stationRoutes);
app.use('/api/v1/drivers', driverRoutes);

// ─── 404 Handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ──────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📖 Swagger docs: http://localhost:${PORT}/api-docs`);
});

// ─── Global Process Error Handlers ─────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err);
  process.exit(1);
});

export default app;
