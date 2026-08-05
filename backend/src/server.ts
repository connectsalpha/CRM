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

const app = express();
app.use(helmet());
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
