import { z } from 'zod';

// Error responses are a contract too: every 4xx body is `{ error: string }`.
export const ErrorResponseSchema = z.object({ error: z.string() });
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
