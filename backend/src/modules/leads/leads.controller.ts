import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateJWT, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { leadCreateSchema, leadUpdateSchema } from '../../shared/validation.schemas.js';

const router = Router();

const getLeadWithAccess = async (id: number, req: AuthenticatedRequest) => {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { assignedEmployee: true },
  });
  if (!lead) return null;
  if (req.user?.role === 'Admin') return lead;
  if (lead.assignedEmployeeId === req.user?.employeeId) return lead;
  return null;
};

router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const filter: any = {};
    if (req.user?.role !== 'Admin') {
      filter.assignedEmployeeId = req.user?.employeeId ?? -1;
    }

    const page = Number(req.query.page);
    const limit = Number(req.query.limit);

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [leads, totalCount] = await Promise.all([
        prisma.lead.findMany({
          where: filter,
          include: {
            assignedEmployee: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
            createdBy: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.lead.count({ where: filter }),
      ]);

      return res.json({
        leads,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        page,
        limit,
      });
    }

    const leads = await prisma.lead.findMany({
      where: filter,
      include: {
        assignedEmployee: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(leads);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const lead = await getLeadWithAccess(Number(req.params.id), req);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' });
    }
    return res.json(lead);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateJWT, validateRequest({ body: leadCreateSchema }), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const {
    name,
    mobile,
    whatsappNumber,
    email,
    businessName,
    location,
    interestedService,
    source,
    status,
    priority,
    dealValue,
    followupDate,
    notes,
    assignedEmployeeId,
  } = req.body;

  try {
    let finalEmployeeId = assignedEmployeeId ? Number(assignedEmployeeId) : null;

    if (!finalEmployeeId) {
      const employees = await prisma.employee.findMany({
        include: {
          _count: {
            select: {
              leads: {
                where: {
                  status: { notIn: ['Converted', 'Lost'] },
                },
              },
            },
          },
        },
      });
      if (employees.length > 0) {
        employees.sort((a, b) => a._count.leads - b._count.leads);
        finalEmployeeId = employees[0].id;
      }
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        mobile,
        whatsappNumber,
        email,
        businessName,
        location,
        interestedService,
        source,
        status: status || 'New Lead',
        priority: priority || 'Medium',
        dealValue: dealValue ? Number(dealValue) : 0,
        followupDate: followupDate ? new Date(followupDate) : null,
        notes,
        createdById: req.user!.id,
        assignedEmployeeId: finalEmployeeId,
      },
      include: {
        assignedEmployee: true,
      },
    });

    await prisma.activity.create({
      data: {
        type: 'LEAD_CREATE',
        details: `Lead "${lead.name}" created and assigned to employee ID ${lead.assignedEmployeeId || 'None'}`,
        userId: req.user!.id,
      },
    });

    return res.status(201).json(lead);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateJWT, validateRequest({ body: leadUpdateSchema }), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const id = Number(req.params.id);
  try {
    const lead = await getLeadWithAccess(id, req);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' });
    }

    const {
      name,
      mobile,
      whatsappNumber,
      email,
      businessName,
      location,
      interestedService,
      source,
      status,
      priority,
      dealValue,
      followupDate,
      notes,
      assignedEmployeeId,
    } = req.body;

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        name,
        mobile,
        whatsappNumber,
        email,
        businessName,
        location,
        interestedService,
        source,
        status,
        priority,
        dealValue: dealValue !== undefined ? Number(dealValue) : undefined,
        followupDate: followupDate ? new Date(followupDate) : null,
        notes,
        assignedEmployeeId: assignedEmployeeId !== undefined ? (assignedEmployeeId ? Number(assignedEmployeeId) : null) : undefined,
      },
    });

    if (status && status !== lead.status) {
      await prisma.activity.create({
        data: {
          type: 'LEAD_STATUS_CHANGE',
          details: `Lead "${updatedLead.name}" status changed from "${lead.status}" to "${status}"`,
          userId: req.user!.id,
        },
      });
    }

    if (assignedEmployeeId !== undefined && Number(assignedEmployeeId) !== lead.assignedEmployeeId) {
      await prisma.activity.create({
        data: {
          type: 'LEAD_ASSIGN',
          details: `Lead "${updatedLead.name}" assigned to Employee ID ${assignedEmployeeId || 'None'}`,
          userId: req.user!.id,
        },
      });
    }

    await prisma.activity.create({
      data: {
        type: 'LEAD_UPDATE',
        details: `Lead "${updatedLead.name}" details updated`,
        userId: req.user!.id,
      },
    });

    return res.json(updatedLead);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const id = Number(req.params.id);
  try {
    const lead = await getLeadWithAccess(id, req);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' });
    }

    await prisma.lead.delete({ where: { id } });

    await prisma.activity.create({
      data: {
        type: 'LEAD_DELETE',
        details: `Lead "${lead.name}" was deleted`,
        userId: req.user!.id,
      },
    });

    return res.json({ message: 'Lead deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:id/convert', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const id = Number(req.params.id);
  try {
    const lead = await getLeadWithAccess(id, req);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' });
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { leadId: id },
    });
    if (existingCustomer) {
      return res.status(400).json({ error: 'Lead is already converted to customer' });
    }

    const customer = await prisma.customer.create({
      data: {
        leadId: id,
        profile: JSON.stringify({
          businessName: lead.businessName,
          interestedService: lead.interestedService,
          location: lead.location,
        }),
        conversationHistory: JSON.stringify([
          { date: new Date().toISOString(), message: 'Lead converted to customer' }
        ]),
        payments: '[]',
        documents: '[]',
        feedback: '',
      },
    });

    await prisma.lead.update({
      where: { id },
      data: { status: 'Converted' },
    });

    await prisma.activity.create({
      data: {
        type: 'LEAD_CONVERT',
        details: `Lead "${lead.name}" converted to Customer`,
        userId: req.user!.id,
      },
    });

    return res.status(201).json(customer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
