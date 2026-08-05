import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const leadCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(1, 'Mobile is required'),
  whatsappNumber: z.string().optional().nullable(),
  email: z.string().email('Invalid email address'),
  businessName: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  interestedService: z.string().optional().nullable(),
  source: z.enum([
    'Website', 'WhatsApp', 'Meta Ads', 'Google Ads', 'Social Media',
    'QR Code', 'Phone Calls', 'Referrals', 'Manual Entry'
  ]),
  status: z.enum([
    'New Lead', 'Contacted', 'Qualified', 'Proposal Sent',
    'Negotiation', 'Follow-up', 'Converted', 'Lost'
  ]).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  dealValue: z.number().nonnegative().optional(),
  followupDate: z.string().datetime().optional().nullable().or(z.string().optional().nullable()),
  notes: z.string().optional().nullable(),
  assignedEmployeeId: z.number().nullable().optional(),
});

export const leadUpdateSchema = leadCreateSchema.partial();

export const customerUpdateSchema = z.object({
  profile: z.string().optional().nullable(),
  conversationHistory: z.string().optional().nullable(),
  payments: z.string().optional().nullable(),
  feedback: z.string().optional().nullable(),
});

export const followupCreateSchema = z.object({
  customerId: z.number().int().positive('Valid Customer ID is required'),
  date: z.string().datetime().or(z.string()),
  reminder: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['Pending', 'Completed', 'Cancelled']).optional(),
});

export const quotationCreateSchema = z.object({
  customerId: z.number().int().positive(),
  quoteNo: z.string().min(1, 'Quote number is required'),
  status: z.enum(['Draft', 'Sent', 'Accepted', 'Declined']).optional(),
  items: z.array(
    z.object({
      itemName: z.string().min(1, 'Item name required'),
      quantity: z.number().int().positive(),
      price: z.number().nonnegative(),
    })
  ).min(1, 'At least one item is required'),
});
