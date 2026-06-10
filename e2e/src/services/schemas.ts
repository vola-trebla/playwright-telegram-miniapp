import { z } from 'zod';

/**
 * Runtime contracts for the marketplace API. Schemas are the single source of truth:
 * the service parses every happy-path response through them (a breach throws a descriptive
 * ZodError), and types are derived via `z.infer` — no hand-written interface can drift.
 */

export const GiftSchema = z.object({
  id: z.string(),
  name: z.string(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  priceTon: z.number(),
  status: z.enum(['listed', 'sold']),
  soldTo: z.string().optional(),
});
export type Gift = z.infer<typeof GiftSchema>;

export const GiftsResponseSchema = z.object({ gifts: z.array(GiftSchema) });
export type GiftsResponse = z.infer<typeof GiftsResponseSchema>;

export const MeResponseSchema = z.object({
  user: z.object({
    id: z.number(),
    first_name: z.string().optional(),
    username: z.string().optional(),
  }),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const BuyResponseSchema = z.object({
  ok: z.literal(true),
  gift: GiftSchema,
  balanceAfter: z.number().optional(),
  txId: z.string().optional(),
});
export type BuyResponse = z.infer<typeof BuyResponseSchema>;

export const BalanceResponseSchema = z.object({ balanceTon: z.number() });
export type BalanceResponse = z.infer<typeof BalanceResponseSchema>;

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

export const TxResponseSchema = z.object({
  txId: z.string(),
  status: z.enum(['pending', 'settled']),
});
export type TxResponse = z.infer<typeof TxResponseSchema>;

export const NotificationSchema = z.object({ to: z.number(), text: z.string() });
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationsResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
});
export type NotificationsResponse = z.infer<typeof NotificationsResponseSchema>;

// Error responses are a contract too: every 4xx body is `{ error: string }`. Validating it
// in negative tests catches drift the status-code check alone would miss.
export const ErrorResponseSchema = z.object({ error: z.string() });
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
