import { z } from 'zod';

export const BalanceResponseSchema = z.object({ balanceTon: z.number() });
export type BalanceResponse = z.infer<typeof BalanceResponseSchema>;
