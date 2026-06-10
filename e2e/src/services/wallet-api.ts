import type { APIResponse } from '@playwright/test';
import { BaseApi } from '@services/base-api';
import { BalanceResponseSchema, type BalanceResponse } from '@services/schemas';

/** Wallet: balance, deposit, withdraw. */
export class WalletApi extends BaseApi {
  getBalanceResponse(): Promise<APIResponse> {
    return this.request.get('/api/balance');
  }

  depositResponse(amountTon: number): Promise<APIResponse> {
    return this.request.post('/api/deposit', { data: { amountTon } });
  }

  withdrawResponse(amountTon: number): Promise<APIResponse> {
    return this.request.post('/api/withdraw', { data: { amountTon } });
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
}
