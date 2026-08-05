import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateJWT, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { followupCreateSchema } from '../../shared/validation.schemas.js';

const router = Router();

const checkCustomerAccess = async (customerId: number, req: AuthenticatedRequest) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { lead: true },
  });
  if (!customer) return false;
  if (req.user?.role === 'Admin') return true;
  return customer.lead.assignedEmployeeId === req.user?.employeeId;
};

router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const filter: any = {};
    if (req.user?.role !== 'Admin') {
      filter.customer = {
        lead: { assignedEmployeeId: req.user?.employeeId ?? -1 },
      };
    }
    const followups = await prisma.followup.findMany({
      where: filter,
      include: {
        customer: {
          include: { lead: true },
        },
      },
      orderBy: { date: 'asc' },
    });
    return res.json(followups);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateJWT, validateRequest({ body: followupCreateSchema }), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { customerId, date, reminder, notes, status } = req.body;

  try {
    const parsedCustomerId = Number(customerId);
    const hasAccess = await checkCustomerAccess(parsedCustomerId, req);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this customer' });
    }

    const followup = await prisma.followup.create({
      data: {
        customerId: parsedCustomerId,
        date: new Date(date),
        reminder: Boolean(reminder),
        notes,
        status: status || 'Pending',
      },
    });

    await prisma.activity.create({
      data: {
        type: 'FOLLOWUP_CREATE',
        details: `Created follow-up for customer ID ${customerId}`,
        userId: req.user!.id,
      },
    });

    return res.status(201).json(followup);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const id = Number(req.params.id);
  try {
    const followup = await prisma.followup.findUnique({
      where: { id },
      include: { customer: { include: { lead: true } } },
    });

    if (!followup) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    const hasAccess = req.user?.role === 'Admin' || followup.customer.lead.assignedEmployeeId === req.user?.employeeId;
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { date, reminder, notes, status } = req.body;

    const updatedFollowup = await prisma.followup.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        reminder: reminder !== undefined ? Boolean(reminder) : undefined,
        notes,
        status,
      },
    });

    return res.json(updatedFollowup);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const id = Number(req.params.id);
  try {
    const followup = await prisma.followup.findUnique({
      where: { id },
      include: { customer: { include: { lead: true } } },
    });

    if (!followup) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    const hasAccess = req.user?.role === 'Admin' || followup.customer.lead.assignedEmployeeId === req.user?.employeeId;
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.followup.delete({ where: { id } });
    return res.json({ message: 'Follow-up deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
