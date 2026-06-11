import { z } from 'zod';

export const SoldEventSchema = z.object({
  type: z.literal('sold'),
  id: z.string(),
  buyer: z.string(),
});
export type SoldEvent = z.infer<typeof SoldEventSchema>;
