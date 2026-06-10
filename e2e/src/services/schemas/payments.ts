import { z } from 'zod';

export const InvoiceResponseSchema = z.object({
  invoiceId: z.string(),
  provider: z.enum(['stars', 'ton']),
  amountTon: z.number(),
  payload: z.string(),
  link: z.string(),
});
export type InvoiceResponse = z.infer<typeof InvoiceResponseSchema>;

export const PayInvoiceResponseSchema = z.object({
  invoiceId: z.string(),
  status: z.literal('paid'),
  balanceTon: z.number(),
});
export type PayInvoiceResponse = z.infer<typeof PayInvoiceResponseSchema>;
