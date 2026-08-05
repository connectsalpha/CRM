import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateJWT, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { quotationCreateSchema } from '../../shared/validation.schemas.js';

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
    const quotations = await prisma.quotation.findMany({
      where: filter,
      include: {
        customer: {
          include: { lead: true },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(quotations);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        customer: {
          include: { lead: true },
        },
        items: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const hasAccess = req.user?.role === 'Admin' || quotation.customer.lead.assignedEmployeeId === req.user?.employeeId;
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json(quotation);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateJWT, validateRequest({ body: quotationCreateSchema }), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { customerId, quoteNo, status, items } = req.body;

  try {
    const parsedCustomerId = Number(customerId);
    const hasAccess = await checkCustomerAccess(parsedCustomerId, req);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let total = 0;
    const formattedItems = items.map((item: any) => {
      const quantity = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      const itemTotal = quantity * price;
      total += itemTotal;
      return {
        itemName: item.itemName,
        quantity,
        price,
        total: itemTotal,
      };
    });

    const quotation = await prisma.quotation.create({
      data: {
        customerId: parsedCustomerId,
        quoteNo,
        status: status || 'Draft',
        total,
        items: {
          create: formattedItems,
        },
      },
      include: {
        items: true,
      },
    });

    await prisma.activity.create({
      data: {
        type: 'QUOTATION_CREATE',
        details: `Quotation "${quoteNo}" created with total ${total}`,
        userId: req.user!.id,
      },
    });

    return res.status(201).json(quotation);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const id = Number(req.params.id);
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: { include: { lead: true } }, items: true },
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const hasAccess = req.user?.role === 'Admin' || quotation.customer.lead.assignedEmployeeId === req.user?.employeeId;
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { status, items } = req.body;

    if (items && Array.isArray(items)) {
      await prisma.quotationItem.deleteMany({
        where: { quotationId: id },
      });

      let total = 0;
      const formattedItems = items.map((item: any) => {
        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const itemTotal = quantity * price;
        total += itemTotal;
        return {
          quotationId: id,
          itemName: item.itemName,
          quantity,
          price,
          total: itemTotal,
        };
      });

      await prisma.quotationItem.createMany({
        data: formattedItems,
      });

      const updatedQuotation = await prisma.quotation.update({
        where: { id },
        data: {
          status: status || undefined,
          total,
        },
        include: {
          items: true,
        },
      });

      return res.json(updatedQuotation);
    } else {
      const updatedQuotation = await prisma.quotation.update({
        where: { id },
        data: {
          status: status || undefined,
        },
        include: {
          items: true,
        },
      });
      return res.json(updatedQuotation);
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const id = Number(req.params.id);
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: { include: { lead: true } } },
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const hasAccess = req.user?.role === 'Admin' || quotation.customer.lead.assignedEmployeeId === req.user?.employeeId;
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.quotation.delete({ where: { id } });
    return res.json({ message: 'Quotation deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
