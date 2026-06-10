import type { APIResponse } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { BaseApi } from '@services/base-api';
import {
  GiftsResponseSchema,
  BuyResponseSchema,
  type GiftsResponse,
  type BuyResponse,
} from '@services/schemas';

/** Catalog: list gifts and buy them. */
export class CatalogApi extends BaseApi {
  getGiftsResponse(): Promise<APIResponse> {
    return this.request.get('/api/gifts');
  }

  buyResponse(id: string, opts: { idempotencyKey?: string } = {}): Promise<APIResponse> {
    const headers = opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : undefined;
    return this.request.post('/api/buy', { data: { id }, headers });
  }

  getGifts(): Promise<GiftsResponse> {
    return this.validated('Получить список подарков', GiftsResponseSchema, () =>
      this.getGiftsResponse(),
    );
  }

  buy(id: string, opts: { idempotencyKey?: string } = {}): Promise<BuyResponse> {
    return this.validated(`Купить подарок #${id}`, BuyResponseSchema, () =>
      this.buyResponse(id, opts),
    );
  }

  /** Convenience: id of the first still-listed gift (fails if none left). */
  firstListedGiftId(): Promise<string> {
    return test.step('Найти первый доступный подарок', async () => {
      const { gifts } = await this.getGifts();
      const gift = gifts.find((g) => g.status === 'listed');
      expect(gift, 'no listed gift available').toBeTruthy();
      return gift!.id;
    });
  }
}
