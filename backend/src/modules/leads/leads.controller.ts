import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../../prisma.js';
import { authenticateJWT, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { leadCreateSchema, leadUpdateSchema } from '../../shared/validation.schemas.js';

const attachmentsDir = path.join(process.cwd(), 'attachments');
if (!fs.existsSync(attachmentsDir)) {
  fs.mkdirSync(attachmentsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, attachmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const originalBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${originalBaseName}-${uniqueSuffix}${ext}`);
  }
});

const allowedExtensions = ['.pdf', '.xls', '.xlsx', '.csv', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

const fileFilter = (req: any, file: any, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Excel, CSV, Word, and Image files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const router = Router();

const getLeadWithAccess = async (id: number, req: AuthenticatedRequest) => {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      assignedEmployee: true,
      attachments: {
        include: {
          uploadedBy: { select: { name: true } }
        }
      }
    },
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
            attachments: true,
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
        attachments: true,
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
    attachments,
  } = req.body;

  try {
    let finalEmployeeId = assignedEmployeeId ? Number(assignedEmployeeId) : null;

    if (!finalEmployeeId) {
      if (req.user?.role === 'Employee' && req.user.employeeId) {
        finalEmployeeId = req.user.employeeId;
      } else {
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
        attachments: attachments && attachments.length > 0 ? {
          create: attachments.map((att: any) => ({
            filename: att.filename,
            originalName: att.originalName,
            fileSize: att.fileSize,
            mimeType: att.mimeType,
            storagePath: att.storagePath,
            uploadedById: req.user!.id
          }))
        } : undefined
      },
      include: {
        assignedEmployee: true,
        attachments: true,
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
      attachments,
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
        attachments: attachments && attachments.length > 0 ? {
          create: attachments.map((att: any) => ({
            filename: att.filename,
            originalName: att.originalName,
            fileSize: att.fileSize,
            mimeType: att.mimeType,
            storagePath: att.storagePath,
            uploadedById: req.user!.id
          }))
        } : undefined
      },
      include: {
        attachments: true
      }
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

router.post('/upload', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    return res.status(201).json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      storagePath: req.file.path
    });
  });
});

router.get('/attachments/:attachmentId/download', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const attachmentId = Number(req.params.attachmentId);
    const attachment = await prisma.leadAttachment.findUnique({
      where: { id: attachmentId },
      include: { lead: true }
    });
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    if (req.user?.role !== 'Admin' && attachment.lead.assignedEmployeeId !== req.user?.employeeId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.resolve(attachment.storagePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Physical file not found on server' });
    }

    return res.download(filePath, attachment.originalName);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/attachments/:attachmentId', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const attachmentId = Number(req.params.attachmentId);
    const attachment = await prisma.leadAttachment.findUnique({
      where: { id: attachmentId },
      include: { lead: true }
    });
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    if (req.user?.role !== 'Admin' && attachment.lead.assignedEmployeeId !== req.user?.employeeId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.resolve(attachment.storagePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.leadAttachment.delete({
      where: { id: attachmentId }
    });

    return res.json({ message: 'Attachment deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
