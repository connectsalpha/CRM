import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateJWT, AuthenticatedRequest } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/leads', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { startDate, endDate, employeeId, status } = req.query;
    const filter: any = {};

    if (req.user?.role !== 'Admin') {
      filter.assignedEmployeeId = req.user?.employeeId ?? -1;
    } else if (employeeId) {
      filter.assignedEmployeeId = Number(employeeId);
    }

    if (status) {
      filter.status = String(status);
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.gte = new Date(String(startDate));
      }
      if (endDate) {
        filter.createdAt.lte = new Date(String(endDate));
      }
    }

    const leads = await prisma.lead.findMany({
      where: filter,
      include: {
        assignedEmployee: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(leads);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/customers', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    const filter: any = {};

    if (req.user?.role !== 'Admin') {
      filter.lead = { assignedEmployeeId: req.user?.employeeId ?? -1 };
    } else if (employeeId) {
      filter.lead = { assignedEmployeeId: Number(employeeId) };
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.gte = new Date(String(startDate));
      }
      if (endDate) {
        filter.createdAt.lte = new Date(String(endDate));
      }
    }

    const customers = await prisma.customer.findMany({
      where: filter,
      include: {
        lead: {
          include: {
            assignedEmployee: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(customers);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/sales', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    const filter: any = {
      status: 'Converted',
    };

    if (req.user?.role !== 'Admin') {
      filter.assignedEmployeeId = req.user?.employeeId ?? -1;
    } else if (employeeId) {
      filter.assignedEmployeeId = Number(employeeId);
    }

    if (startDate || endDate) {
      filter.updatedAt = {};
      if (startDate) {
        filter.updatedAt.gte = new Date(String(startDate));
      }
      if (endDate) {
        filter.updatedAt.lte = new Date(String(endDate));
      }
    }

    const sales = await prisma.lead.findMany({
      where: filter,
      select: {
        id: true,
        name: true,
        businessName: true,
        dealValue: true,
        updatedAt: true,
        assignedEmployee: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json(sales);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
