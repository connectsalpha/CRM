import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../../prisma.js';
import { authenticateJWT, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { customerUpdateSchema } from '../../shared/validation.schemas.js';

const router = Router();

const ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // 1. Path traversal check
  if (file.originalname !== path.basename(file.originalname)) {
    return cb(new Error('Invalid filename path traversal detected'), false);
  }

  // 2. Double extension check
  const parts = file.originalname.split('.');
  if (parts.length > 2) {
    const dangerousExts = ['php', 'html', 'htm', 'exe', 'js', 'sh', 'bat', 'cmd', 'jsp', 'asp', 'aspx', 'vbs', 'svg'];
    const hasDanger = parts.slice(0, -1).some((p: string) => dangerousExts.includes(p.toLowerCase()));
    if (hasDanger) {
      return cb(new Error('Double extension attack detected'), false);
    }
  }

  // 3. MIME type and Extension whitelists
  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIMETYPES.includes(file.mimetype)) {
    return cb(new Error('Only PDF, Word, and Image files are allowed'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

const uploadWrapper = (req: any, res: any, next: any) => {
  upload.single('file')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

const getCustomerWithAccess = async (id: number, req: AuthenticatedRequest) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      lead: {
        include: { assignedEmployee: true },
      },
      quotations: true,
      followups: true,
    },
  });
  if (!customer) return null;
  if (req.user?.role === 'Admin') return customer;
  if (customer.lead.assignedEmployeeId === req.user?.employeeId) return customer;
  return null;
};

router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const filter: any = {};
    if (req.user?.role !== 'Admin') {
      filter.lead = { assignedEmployeeId: req.user?.employeeId ?? -1 };
    }
    const customers = await prisma.customer.findMany({
      where: filter,
      include: {
        lead: {
          include: {
            assignedEmployee: {
              include: { user: { select: { name: true, email: true } } },
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

router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const customer = await getCustomerWithAccess(Number(req.params.id), req);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found or access denied' });
    }
    return res.json(customer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateJWT, validateRequest({ body: customerUpdateSchema }), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const id = Number(req.params.id);
  try {
    const customer = await getCustomerWithAccess(id, req);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found or access denied' });
    }

    const { profile, conversationHistory, payments, feedback } = req.body;

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        profile: profile !== undefined ? (typeof profile === 'string' ? profile : JSON.stringify(profile)) : undefined,
        conversationHistory: conversationHistory !== undefined ? (typeof conversationHistory === 'string' ? conversationHistory : JSON.stringify(conversationHistory)) : undefined,
        payments: payments !== undefined ? (typeof payments === 'string' ? payments : JSON.stringify(payments)) : undefined,
        feedback: feedback !== undefined ? feedback : undefined,
      },
    });

    await prisma.activity.create({
      data: {
        type: 'CUSTOMER_UPDATE',
        details: `Customer details updated for lead "${customer.lead.name}"`,
        userId: req.user!.id,
      },
    });

    return res.json(updatedCustomer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:id/documents', authenticateJWT, uploadWrapper, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const id = Number(req.params.id);
  try {
    const customer = await getCustomerWithAccess(id, req);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found or access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const docs = customer.documents ? JSON.parse(customer.documents) : [];
    const newDoc = {
      name: req.file.originalname,
      path: req.file.path,
      uploadedAt: new Date().toISOString(),
    };
    docs.push(newDoc);

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        documents: JSON.stringify(docs),
      },
    });

    await prisma.activity.create({
      data: {
        type: 'CUSTOMER_DOCUMENT_UPLOAD',
        details: `Document "${req.file.originalname}" uploaded for Customer "${customer.lead.name}"`,
        userId: req.user!.id,
      },
    });

    return res.json(updatedCustomer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
