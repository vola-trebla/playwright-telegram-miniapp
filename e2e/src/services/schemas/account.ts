import { z } from 'zod';

export const MeResponseSchema = z.object({
  user: z.object({
    id: z.number(),
    first_name: z.string().optional(),
    username: z.string().optional(),
  }),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const NotificationSchema = z.object({ to: z.number(), text: z.string() });
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationsResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
});
export type NotificationsResponse = z.infer<typeof NotificationsResponseSchema>;
