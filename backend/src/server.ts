import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { validateEnv } from './shared/env.validator.js';
import { globalLimiter } from './middleware/rate-limiter.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

import authRouter from './modules/auth/auth.controller.js';
import usersRouter from './modules/users/users.controller.js';
import leadsRouter from './modules/leads/leads.controller.js';
import customersRouter from './modules/customers/customers.controller.js';
import followupsRouter from './modules/followups/followups.controller.js';
import quotationsRouter from './modules/quotations/quotations.controller.js';
import reportsRouter from './modules/reports/reports.controller.js';
import dashboardRouter from './modules/dashboard/dashboard.controller.js';

validateEnv();

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const app = express();
app.use(helmet());
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  process.env.RENDER_EXTERNAL_URL,
].filter(Boolean) as string[];

app.use(
  cors((req: any, callback: any) => {
    const origin = req.headers.origin;
    const corsOptions = {
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      origin: false as any,
    };

    if (!origin) {
      corsOptions.origin = true;
      return callback(null, corsOptions);
    }

    const host = req.headers.host;
    const originHost = origin.replace(/^https?:\/\//, '');

    const isLocal = originHost.startsWith('localhost:') || originHost.startsWith('127.0.0.1:');
    const isSameOrigin = originHost === host;
    const isAllowedCustom = allowedOrigins.includes(origin);

    if (isLocal || isSameOrigin || isAllowedCustom) {
      corsOptions.origin = origin;
    }

    callback(null, corsOptions);
  })
);

app.use(express.json());
app.use('/api', globalLimiter);

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req, res): Promise<any> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ status: 'ready', database: 'connected' });
  } catch (error: any) {
    return res.status(503).json({ status: 'unready', database: 'disconnected', error: error.message });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/followups', followupsRouter);
app.use('/api/quotations', quotationsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/dashboard', dashboardRouter);

// Serve static frontend assets in production
const frontendDir = path.join(process.cwd(), 'frontend', 'dist');
if (fs.existsSync(frontendDir)) {
  console.log(`Serving static frontend from: ${frontendDir}`);
  app.use(express.static(frontendDir));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/ready')
    ) {
      return next();
    }
    res.sendFile(path.join(frontendDir, 'index.html'));
  });
} else {
  console.warn(`Static frontend directory not found at: ${frontendDir}`);
}

app.use(errorHandler);

const seedDatabase = async () => {
  try {
    const rolesCount = await prisma.role.count();
    if (rolesCount === 0) {
      console.log('Seeding roles...');
      await prisma.role.createMany({
        data: [{ name: 'Admin' }, { name: 'Employee' }],
      });
    }

    const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
    const employeeRole = await prisma.role.findUnique({ where: { name: 'Employee' } });

    const usersCount = await prisma.user.count();
    if (usersCount === 0 && adminRole && employeeRole) {
      console.log('Seeding default users...');
      const adminPassword = await bcrypt.hash('Admin123!', 10);
      const employeePassword = await bcrypt.hash('Employee123!', 10);

      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@alphacmr.com',
          password: adminPassword,
          name: 'System Admin',
          roleId: adminRole.id,
        },
      });

      const employeeUser = await prisma.user.create({
        data: {
          email: 'employee@alphacmr.com',
          password: employeePassword,
          name: 'John Employee',
          roleId: employeeRole.id,
        },
      });

      await prisma.employee.create({
        data: {
          userId: employeeUser.id,
          name: employeeUser.name,
        },
      });

      console.log('Seeding completed successfully!');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await seedDatabase();
});
