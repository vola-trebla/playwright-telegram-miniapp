import type { APIRequestContext, APIResponse } from '@playwright/test';
import { test, expect } from '@playwright/test';
import type { z } from 'zod';
import {
  GiftsResponseSchema,
  MeResponseSchema,
  BuyResponseSchema,
  NotificationsResponseSchema,
  BalanceResponseSchema,
  InvoiceResponseSchema,
  PayInvoiceResponseSchema,
  TxResponseSchema,
  type GiftsResponse,
  type MeResponse,
  type BuyResponse,
  type NotificationsResponse,
  type BalanceResponse,
  type InvoiceResponse,
  type PayInvoiceResponse,
  type TxResponse,
} from '@services/schemas';

type Provider = 'stars' | 'ton';

/**
 * Service-layer client for the marketplace backend. All HTTP lives here, never in specs.
 * Two flavours per endpoint:
 * - `*Response` — raw APIResponse, no assertions; for negative/edge paths the spec inspects.
 * - assertive helper — asserts `ok()` and returns data validated against its zod schema.
 *   These collapse onto `validated()`, which wraps the call in a `test.step` (human-readable
 *   label in the report), asserts ok, and parses the body — so a new endpoint is one line.
 *
 * The injected request context carries baseURL + the signed initData header (see fixture),
 * so methods stay auth-agnostic.
 */
export class MarketApi {
  constructor(private readonly request: APIRequestContext) {}

  /** Run a request, assert it succeeded, and validate the body against `schema`. */
  private validated<T>(
    stepName: string,
    schema: z.ZodType<T>,
    call: () => Promise<APIResponse>,
  ): Promise<T> {
    return test.step(stepName, async () => {
      const res = await call();
      expect(res.ok(), `${stepName} failed: ${res.status()}`).toBeTruthy();
      return schema.parse(await res.json());
    });
  }

  // --- Raw responses (no assertions; for negative/edge paths) ---

  async getGiftsResponse(): Promise<APIResponse> {
    return this.request.get('/api/gifts');
  }

  async getMeResponse(): Promise<APIResponse> {
    return this.request.get('/api/me');
  }

  async buyResponse(id: string, opts: { idempotencyKey?: string } = {}): Promise<APIResponse> {
    const headers = opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : undefined;
    return this.request.post('/api/buy', { data: { id }, headers });
  }

  async getNotificationsResponse(): Promise<APIResponse> {
    return this.request.get('/api/notifications');
  }

  async getBalanceResponse(): Promise<APIResponse> {
    return this.request.get('/api/balance');
  }

  async depositResponse(amountTon: number): Promise<APIResponse> {
    return this.request.post('/api/deposit', { data: { amountTon } });
  }

  async withdrawResponse(amountTon: number): Promise<APIResponse> {
    return this.request.post('/api/withdraw', { data: { amountTon } });
  }

  // provider is a plain string here so negative tests can send an invalid one.
  async createInvoiceResponse(amountTon: number, provider: string): Promise<APIResponse> {
    return this.request.post('/api/invoice', { data: { amountTon, provider } });
  }

  async payInvoiceResponse(invoiceId: string): Promise<APIResponse> {
    return this.request.post(`/api/invoice/${invoiceId}/pay`);
  }

  async getTxResponse(txId: string): Promise<APIResponse> {
    return this.request.get(`/api/tx/${txId}`);
  }

  // --- Assertive, contract-validated helpers ---

  getGifts(): Promise<GiftsResponse> {
    return this.validated('Получить список подарков', GiftsResponseSchema, () =>
      this.getGiftsResponse(),
    );
  }

  getMe(): Promise<MeResponse> {
    return this.validated('Получить текущего пользователя', MeResponseSchema, () =>
      this.getMeResponse(),
    );
  }

  buy(id: string, opts: { idempotencyKey?: string } = {}): Promise<BuyResponse> {
    return this.validated(`Купить подарок #${id}`, BuyResponseSchema, () =>
      this.buyResponse(id, opts),
    );
  }

  getNotifications(): Promise<NotificationsResponse> {
    return this.validated('Получить уведомления', NotificationsResponseSchema, () =>
      this.getNotificationsResponse(),
    );
  }

  getBalance(): Promise<BalanceResponse> {
    return this.validated('Получить баланс', BalanceResponseSchema, () =>
      this.getBalanceResponse(),
    );
  }

  deposit(amountTon: number): Promise<BalanceResponse> {
    return this.validated(`Пополнить баланс на ${amountTon} TON`, BalanceResponseSchema, () =>
      this.depositResponse(amountTon),
    );
  }

  withdraw(amountTon: number): Promise<BalanceResponse> {
    return this.validated(`Вывести ${amountTon} TON`, BalanceResponseSchema, () =>
      this.withdrawResponse(amountTon),
    );
  }

  createInvoice(amountTon: number, provider: Provider): Promise<InvoiceResponse> {
    return this.validated(`Создать инвойс на ${amountTon} TON (${provider})`, InvoiceResponseSchema, () =>
      this.createInvoiceResponse(amountTon, provider),
    );
  }

  payInvoice(invoiceId: string): Promise<PayInvoiceResponse> {
    return this.validated('Оплатить инвойс', PayInvoiceResponseSchema, () =>
      this.payInvoiceResponse(invoiceId),
    );
  }

  getTx(txId: string): Promise<TxResponse> {
    return this.validated('Получить статус расчёта', TxResponseSchema, () => this.getTxResponse(txId));
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
