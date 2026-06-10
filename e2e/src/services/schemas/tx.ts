import { z } from 'zod';

export const TxResponseSchema = z.object({
  txId: z.string(),
  status: z.enum(['pending', 'settled']),
});
export type TxResponse = z.infer<typeof TxResponseSchema>;
