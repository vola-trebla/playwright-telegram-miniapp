import type { APIResponse } from '@playwright/test';
import { BaseApi } from '@services/base-api';
import {
  InvoiceResponseSchema,
  PayInvoiceResponseSchema,
  type InvoiceResponse,
  type PayInvoiceResponse,
} from '@services/schemas';

type Provider = 'stars' | 'ton';

/** Payments: a top-up invoice intent (Stars / TON) and its provider callback. */
export class PaymentsApi extends BaseApi {
  // provider is a plain string here so negative tests can send an invalid one.
  createInvoiceResponse(amountTon: number, provider: string): Promise<APIResponse> {
    return this.request.post('/api/invoice', { data: { amountTon, provider } });
  }

  payInvoiceResponse(invoiceId: string): Promise<APIResponse> {
    return this.request.post(`/api/invoice/${invoiceId}/pay`);
  }

  createInvoice(amountTon: number, provider: Provider): Promise<InvoiceResponse> {
    return this.validated(
      `Создать инвойс на ${amountTon} TON (${provider})`,
      InvoiceResponseSchema,
      () => this.createInvoiceResponse(amountTon, provider),
    );
  }

  payInvoice(invoiceId: string): Promise<PayInvoiceResponse> {
    return this.validated('Оплатить инвойс', PayInvoiceResponseSchema, () =>
      this.payInvoiceResponse(invoiceId),
    );
  }
}
