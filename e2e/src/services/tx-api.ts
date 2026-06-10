import type { APIResponse } from '@playwright/test';
import { BaseApi } from '@services/base-api';
import { TxResponseSchema, type TxResponse } from '@services/schemas';

/** Settlement: poll a buy's on-chain tx until it settles. */
export class TxApi extends BaseApi {
  getTxResponse(txId: string): Promise<APIResponse> {
    return this.request.get(`/api/tx/${txId}`);
  }

  getTx(txId: string): Promise<TxResponse> {
    return this.validated('Получить статус расчёта', TxResponseSchema, () =>
      this.getTxResponse(txId),
    );
  }
}
