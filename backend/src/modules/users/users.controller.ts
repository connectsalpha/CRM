import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../prisma.js';
import { authenticateJWT, AuthenticatedRequest, requireRole } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { userCreateSchema, userUpdateSchema } from '../../shared/validation.schemas.js';

const router = Router();

// Retrieve all employees for assigning dropdowns (Available to any authenticated user)
router.get('/employees', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });
    return res.json(employees);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Retrieve all users (Admin only)
router.get('/', authenticateJWT, requireRole(['Admin']), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        employee: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const safeUsers = users.map((u) => {
      const { password, refreshToken, ...rest } = u;
      return rest;
    });
    return res.json(safeUsers);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Create a new user account (Admin only)
router.post('/', authenticateJWT, requireRole(['Admin']), validateRequest({ body: userCreateSchema }), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { name, email, password, role } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const roleObj = await prisma.role.findUnique({
      where: { name: role },
    });
    if (!roleObj) {
      return res.status(400).json({ error: `Role '${role}' not found` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          roleId: roleObj.id,
        },
        include: {
          role: true,
        },
      });

      if (role === 'Employee') {
        const employee = await tx.employee.create({
          data: {
            userId: user.id,
            name: user.name,
          },
        });
        return { ...user, employee };
      }

      return user;
    });

    const { password: _, refreshToken: __, ...safe } = newUser as any;
    return res.status(201).json(safe);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Edit user account details (Admin only)
router.put('/:id', authenticateJWT, requireRole(['Admin']), validateRequest({ body: userUpdateSchema }), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const { name, email, password, role } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, employee: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email && email !== user.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });
      if (emailExists) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
    }

    let roleObj = null;
    if (role) {
      roleObj = await prisma.role.findUnique({
        where: { name: role },
      });
      if (!roleObj) {
        return res.status(400).json({ error: `Role '${role}' not found` });
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(hashedPassword && { password: hashedPassword }),
          ...(roleObj && { roleId: roleObj.id }),
        },
        include: {
          role: true,
          employee: true,
        },
      });

      if (role) {
        if (role === 'Employee' && !updatedUser.employee) {
          const employee = await tx.employee.create({
            data: {
              userId: updatedUser.id,
              name: updatedUser.name,
            },
          });
          return { ...updatedUser, employee };
        } else if (role === 'Admin' && updatedUser.employee) {
          await tx.employee.delete({
            where: { id: updatedUser.employee.id },
          });
          return { ...updatedUser, employee: null };
        }
      } else if (name && updatedUser.employee) {
        const employee = await tx.employee.update({
          where: { id: updatedUser.employee.id },
          data: { name },
        });
        return { ...updatedUser, employee };
      }

      return updatedUser;
    });

    const { password: _, refreshToken: __, ...safe } = updated as any;
    return res.json(safe);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete user account (Admin only)
router.delete('/:id', authenticateJWT, requireRole(['Admin']), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (userId === req.user?.id) {
    return res.status(400).json({ error: 'Cannot delete your own admin account' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const leadsCount = await prisma.lead.count({
      where: { createdById: userId },
    });
    if (leadsCount > 0) {
      return res.status(400).json({ error: 'Cannot delete user who has created leads in the system' });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
