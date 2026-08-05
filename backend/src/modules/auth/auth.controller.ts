import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma.js';
import { authenticateJWT, AuthenticatedRequest } from '../../middleware/auth.middleware.js';

import { validateRequest } from '../../middleware/validation.middleware.js';
import { loginSchema } from '../../shared/validation.schemas.js';
import { loginLimiter } from '../../middleware/rate-limiter.middleware.js';

const router = Router();

const parseCookies = (cookieHeader?: string) => {
  if (!cookieHeader) return {};
  const list: any = {};
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    list[parts.shift()!.trim()] = decodeURI(parts.join('='));
  });
  return list;
};

router.post('/login', loginLimiter, validateRequest({ body: loginSchema }), async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, employee: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role.name },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await prisma.activity.create({
      data: {
        type: 'USER_LOGIN',
        details: `User "${user.email}" successfully logged in`,
        userId: user.id,
      },
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        employeeId: user.employee?.id,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/refresh', async (req: Request, res: Response): Promise<any> => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['refreshToken'];
  if (!token) {
    return res.status(401).json({ error: 'Refresh token missing' });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { id: number };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true, employee: true },
    });

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ error: 'Invalid refresh token or revoked session' });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role.name },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        employeeId: user.employee?.id,
      },
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

router.post('/logout', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (req.user?.id) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null },
      });
      await prisma.activity.create({
        data: {
          type: 'USER_LOGOUT',
          details: `User ID ${req.user.id} logged out`,
          userId: req.user.id,
        },
      });
    }
  } catch (error) {
    // Ignore db write error on logout
  }

  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
  return res.json({ message: 'Logged out successfully' });
});

router.get('/me', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      include: { role: true, employee: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      employeeId: user.employee?.id,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
