import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateJWT, AuthenticatedRequest } from '../../middleware/auth.middleware.js';

const router = Router();

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

export default router;
