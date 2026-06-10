import type { APIRequestContext } from '@playwright/test';
import { CatalogApi } from '@services/catalog-api';
import { AccountApi } from '@services/account-api';
import { WalletApi } from '@services/wallet-api';
import { PaymentsApi } from '@services/payments-api';
import { TxApi } from '@services/tx-api';

/**
 * Marketplace API client — a thin facade composing the domain clients, so specs read by domain:
 * `market.catalog.buy()`, `market.wallet.deposit()`, `market.payments.createInvoice()`, etc.
 * Each new domain is its own file; this just wires them to one shared request context.
 */
export class MarketApi {
  readonly catalog: CatalogApi;
  readonly account: AccountApi;
  readonly wallet: WalletApi;
  readonly payments: PaymentsApi;
  readonly tx: TxApi;

  constructor(request: APIRequestContext) {
    this.catalog = new CatalogApi(request);
    this.account = new AccountApi(request);
    this.wallet = new WalletApi(request);
    this.payments = new PaymentsApi(request);
    this.tx = new TxApi(request);
  }
}
