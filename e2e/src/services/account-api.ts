import type { APIResponse } from '@playwright/test';
import { BaseApi } from '@services/base-api';
import {
  MeResponseSchema,
  NotificationsResponseSchema,
  type MeResponse,
  type NotificationsResponse,
} from '@services/schemas';

/** Account: the signed-in identity and its notifications. */
export class AccountApi extends BaseApi {
  getMeResponse(): Promise<APIResponse> {
    return this.request.get('/api/me');
  }

  getNotificationsResponse(): Promise<APIResponse> {
    return this.request.get('/api/notifications');
  }

  getMe(): Promise<MeResponse> {
    return this.validated('Получить текущего пользователя', MeResponseSchema, () =>
      this.getMeResponse(),
    );
  }

  getNotifications(): Promise<NotificationsResponse> {
    return this.validated('Получить уведомления', NotificationsResponseSchema, () =>
      this.getNotificationsResponse(),
    );
  }
}
