import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

export const leadCreateSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name is required')
    .refine(v => !/^\d+$/.test(v), 'Please enter a valid name.'),
  mobile: z.string()
    .trim()
    .refine(v => /^\d{10}$/.test(v), 'Mobile number must be exactly 10 digits'),
  whatsappNumber: z.string()
    .trim()
    .min(1, 'WhatsApp number is required')
    .refine(v => /^\d{10}$/.test(v), 'WhatsApp number must be exactly 10 digits'),
  email: z.string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  businessName: z.string()
    .trim()
    .min(1, 'Business name is required'),
  location: z.string()
    .trim()
    .min(1, 'Location is required'),
  interestedService: z.string()
    .trim()
    .min(1, 'Interested service is required'),
  source: z.enum([
    'Website', 'WhatsApp', 'Meta Ads', 'Google Ads', 'Social Media',
    'QR Code', 'Phone Calls', 'Referrals', 'Manual Entry'
  ], { required_error: 'Source is required' }),
  status: z.enum([
    'New Lead', 'Contacted', 'Qualified', 'Proposal Sent',
    'Negotiation', 'Follow-up', 'Converted', 'Lost'
  ]).default('New Lead'),
  priority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  dealValue: z.preprocess((val) => {
    if (val === '' || val === undefined || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? -1 : num;
  }, z.number().nonnegative('Deal value cannot be negative')),
  followupDate: z.string()
    .trim()
    .min(1, 'Follow-up date is required')
    .refine(v => {
      const date = Date.parse(v);
      return !isNaN(date);
    }, 'Invalid date format'),
  notes: z.string()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional()
    .nullable()
    .transform(v => v ? v.trim() : null),
  attachments: z.array(z.object({
    filename: z.string(),
    originalName: z.string(),
    mimeType: z.string(),
    fileSize: z.number().positive(),
    storagePath: z.string()
  })).optional(),
  assignedEmployeeId: z.number().nullable().optional(),
});

export const leadUpdateSchema = leadCreateSchema.partial();

export const customerUpdateSchema = z.object({
  profile: z.string().max(2000, 'Profile cannot exceed 2000 characters').optional().nullable(),
  conversationHistory: z.string().optional().nullable(),
  payments: z.string().optional().nullable(),
  feedback: z.string().max(2000, 'Feedback cannot exceed 2000 characters').optional().nullable(),
});

export const followupCreateSchema = z.object({
  customerId: z.number().int().positive('Valid Customer ID is required'),
  date: z.string().refine(v => !isNaN(Date.parse(v)), 'Invalid date format'),
  reminder: z.boolean().optional(),
  notes: z.string()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional()
    .nullable()
    .transform(v => v ? v.trim() : null),
  status: z.enum(['Pending', 'Completed', 'Cancelled']).optional(),
});

export const quotationCreateSchema = z.object({
  customerId: z.number().int().positive(),
  quoteNo: z.string().min(1, 'Quote number is required'),
  status: z.enum(['Draft', 'Sent', 'Accepted', 'Declined']).optional(),
  items: z.array(
    z.object({
      itemName: z.string().min(1, 'Item name required'),
      quantity: z.number().int().positive('Quantity must be positive'),
      price: z.number().nonnegative('Price must be non-negative'),
    })
  ).min(1, 'At least one item is required'),
});

export const userCreateSchema = z.object({
  name: z.string().transform(v => v.trim()).refine(v => v.length > 0, 'Name is required'),
  email: z.string().email('Invalid email address').transform(v => v.trim()),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['Admin', 'Employee']),
});

export const userUpdateSchema = z.object({
  name: z.string().transform(v => v.trim()).refine(v => v.length > 0, 'Name is required').optional(),
  email: z.string().email('Invalid email address').transform(v => v.trim()).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().nullable().or(z.literal('')),
  role: z.enum(['Admin', 'Employee']).optional(),
});
