import { z } from 'zod';

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

export const BuyResponseSchema = z.object({
  ok: z.literal(true),
  gift: GiftSchema,
  balanceAfter: z.number().optional(),
  txId: z.string().optional(),
});
export type BuyResponse = z.infer<typeof BuyResponseSchema>;
