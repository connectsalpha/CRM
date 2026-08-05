import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateJWT, AuthenticatedRequest } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const isEmployee = req.user?.role !== 'Admin';
    const employeeId = req.user?.employeeId ?? -1;

    const leadFilter = isEmployee ? { assignedEmployeeId: employeeId } : {};
    const customerFilter = isEmployee ? { lead: { assignedEmployeeId: employeeId } } : {};
    const followupFilter = isEmployee ? { customer: { lead: { assignedEmployeeId: employeeId } }, status: 'Pending' } : { status: 'Pending' };

    const totalLeads = await prisma.lead.count({ where: leadFilter });
    const totalCustomers = await prisma.customer.count({ where: customerFilter });
    const pendingFollowups = await prisma.followup.count({ where: followupFilter });

    const revenueResult = await prisma.lead.aggregate({
      where: {
        ...leadFilter,
        status: 'Converted',
      },
      _sum: {
        dealValue: true,
      },
    });
    const revenue = revenueResult._sum.dealValue || 0;

    const activityFilter = isEmployee ? { userId: req.user?.id } : {};
    const recentActivities = await prisma.activity.findMany({
      where: activityFilter,
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return res.json({
      totalLeads,
      totalCustomers,
      pendingFollowups,
      revenue,
      recentActivities,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
