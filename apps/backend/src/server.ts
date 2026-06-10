import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateInitData, type TgUser } from './init-data.js';

const PORT = Number(process.env.PORT ?? 3000);
const BOT_TOKEN = process.env.BOT_TOKEN ?? 'dev-token';
// DEV_MODE lets you poke the app in a plain browser (no Telegram). Set DEV_MODE=false
// to enforce real initData validation (used once the bot is wired up).
const DEV_MODE = process.env.DEV_MODE !== 'false';
// When NOTIFY=true the backend actually DMs the buyer via the Telegram Bot API on a sale
// (the cross-system reaction). Off by default so the test suite stays hermetic.
const NOTIFY = process.env.NOTIFY === 'true';

const dir = path.dirname(fileURLToPath(import.meta.url));

interface Gift {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  priceTon: number;
  status: 'listed' | 'sold';
  soldTo?: string;
}

// Seed catalog. Rarity counts (used by tests): legendary 2 (ids 1 & 6), the rest epic/rare/common.
// Total 20 — extra gifts (13–20) give dedicated ids to the money/concurrency specs.
const gifts: Gift[] = [
  { id: '1', name: 'Plush Pepe', rarity: 'legendary', priceTon: 1200, status: 'listed' },
  { id: '2', name: "Durov's Cap", rarity: 'epic', priceTon: 820, status: 'listed' },
  { id: '3', name: 'Homemade Cake', rarity: 'rare', priceTon: 95, status: 'listed' },
  { id: '4', name: 'Eternal Rose', rarity: 'epic', priceTon: 540, status: 'listed' },
  { id: '5', name: 'Jelly Bunny', rarity: 'common', priceTon: 18, status: 'listed' },
  { id: '6', name: 'Diamond Star', rarity: 'legendary', priceTon: 2100, status: 'listed' },
  { id: '7', name: 'Toy Bear', rarity: 'common', priceTon: 25, status: 'listed' },
  { id: '8', name: 'Lol Pop', rarity: 'rare', priceTon: 60, status: 'listed' },
  { id: '9', name: 'Spy Agaric', rarity: 'epic', priceTon: 300, status: 'listed' },
  { id: '10', name: 'Snow Mittens', rarity: 'common', priceTon: 15, status: 'listed' },
  { id: '11', name: 'Crystal Ball', rarity: 'epic', priceTon: 410, status: 'listed' },
  { id: '12', name: 'Santa Hat', rarity: 'rare', priceTon: 75, status: 'listed' },
  { id: '13', name: 'Galaxy Cat', rarity: 'epic', priceTon: 350, status: 'listed' },
  { id: '14', name: 'Pixel Sword', rarity: 'rare', priceTon: 80, status: 'listed' },
  { id: '15', name: 'Lucky Clover', rarity: 'common', priceTon: 22, status: 'listed' },
  { id: '16', name: 'Neon Wolf', rarity: 'epic', priceTon: 480, status: 'listed' },
  { id: '17', name: 'Retro Boombox', rarity: 'rare', priceTon: 110, status: 'listed' },
  { id: '18', name: 'Bubble Gum', rarity: 'common', priceTon: 12, status: 'listed' },
  { id: '19', name: 'Astro Helmet', rarity: 'epic', priceTon: 600, status: 'listed' },
  { id: '20', name: 'Golden Ticket', rarity: 'rare', priceTon: 130, status: 'listed' },
];

// Outbound Telegram notifications produced by cross-system reactions (e.g. a sale).
// Recorded in memory so tests can assert the reaction WITHOUT a real Telegram account;
// real delivery to the user's chat happens via the Bot API when NOTIFY=true.
interface Notification {
  to: number;
  text: string;
}
const notifications: Notification[] = [];

// --- Money model (in-memory) ---
// Every user starts with a generous balance, so plain buy tests work without topping up.
// Real top-ups go through an invoice (Telegram Stars / TON); buying debits the balance.
const STARTING_BALANCE = 100_000;
const balances = new Map<number, number>();
const getBalance = (userId: number): number => balances.get(userId) ?? STARTING_BALANCE;

// Top-up intent — what the frontend would hand to openInvoice / TON Connect.
interface Invoice {
  id: string;
  userId: number;
  amountTon: number;
  provider: 'stars' | 'ton';
  status: 'pending' | 'paid';
  payload: string;
}
const invoices = new Map<string, Invoice>();

// Semi on-chain settlement: a buy spawns a tx that settles asynchronously.
interface Tx {
  id: string;
  giftId: string;
  userId: number;
  createdAt: number;
}
const txs = new Map<string, Tx>();
const SETTLE_MS = 1000;

// Idempotency: a repeated buy with the same key returns the first result, no double charge.
const idempotency = new Map<string, { status: number; body: unknown }>();

interface AuthedRequest extends Request {
  user?: TgUser;
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(dir, '..', 'public')));

/** Auth gate: trust the user only if initData validates (or fall back in DEV_MODE). */
function auth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const initData = String(req.header('x-telegram-init-data') ?? '');
  const result = validateInitData(initData, BOT_TOKEN);
  if (result.ok) {
    req.user = result.user;
    next();
    return;
  }
  if (DEV_MODE) {
    req.user = { id: 0, first_name: 'Dev (no Telegram)' };
    next();
    return;
  }
  res.status(401).json({ error: 'invalid or missing initData' });
}

app.get('/api/me', auth, (req: AuthedRequest, res: Response) => {
  res.json({ user: req.user });
});

app.get('/api/gifts', auth, (_req: AuthedRequest, res: Response) => {
  res.json({ gifts });
});

app.post('/api/buy', auth, (req: AuthedRequest, res: Response) => {
  const userId = req.user?.id ?? 0;
  const key = req.header('idempotency-key');

  // Replay: a retried request with the same key returns the first result verbatim.
  if (key && idempotency.has(key)) {
    const cached = idempotency.get(key)!;
    res.status(cached.status).json(cached.body);
    return;
  }
  // Every response goes through reply(), which caches it under the idempotency key.
  const reply = (status: number, body: unknown): void => {
    if (key) idempotency.set(key, { status, body: structuredClone(body) });
    res.status(status).json(body);
  };

  const id = String((req.body as { id?: string })?.id ?? '');
  if (!id) {
    reply(400, { error: 'id is required' });
    return;
  }
  const gift = gifts.find((g) => g.id === id);
  if (!gift) {
    reply(404, { error: 'gift not found' });
    return;
  }
  if (gift.status === 'sold') {
    // The race-condition path: second buyer of the same gift gets a clean 409.
    reply(409, { error: 'already sold' });
    return;
  }
  if (getBalance(userId) < gift.priceTon) {
    reply(402, { error: 'insufficient balance' });
    return;
  }

  balances.set(userId, getBalance(userId) - gift.priceTon);
  gift.status = 'sold';
  gift.soldTo = req.user?.first_name ?? 'someone';
  broadcast({ type: 'sold', id: gift.id, buyer: gift.soldTo });

  // Semi on-chain: record a settlement tx the client can poll until 'settled'.
  const tx: Tx = { id: randomUUID(), giftId: gift.id, userId, createdAt: Date.now() };
  txs.set(tx.id, tx);

  // Cross-system reaction: a WEB/Mini App action triggers a Telegram notification to the buyer.
  const note: Notification = {
    to: userId,
    text: `You bought ${gift.name} for ${gift.priceTon} TON 🎁`,
  };
  notifications.push(note);
  if (NOTIFY) void sendTelegram(note.to, note.text);

  reply(200, { ok: true, gift, balanceAfter: getBalance(userId), txId: tx.id });
});

app.get('/api/notifications', auth, (req: AuthedRequest, res: Response) => {
  // The buyer's own notifications — lets tests assert the cross-system reaction fired.
  const mine = notifications.filter((n) => n.to === req.user?.id);
  res.json({ notifications: mine });
});

// --- Wallet ---

app.get('/api/balance', auth, (req: AuthedRequest, res: Response) => {
  res.json({ balanceTon: getBalance(req.user?.id ?? 0) });
});

app.post('/api/deposit', auth, (req: AuthedRequest, res: Response) => {
  const amount = Number((req.body as { amountTon?: unknown })?.amountTon);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: 'amountTon must be a positive number' });
    return;
  }
  const userId = req.user?.id ?? 0;
  balances.set(userId, getBalance(userId) + amount);
  res.json({ balanceTon: getBalance(userId) });
});

app.post('/api/withdraw', auth, (req: AuthedRequest, res: Response) => {
  const amount = Number((req.body as { amountTon?: unknown })?.amountTon);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: 'amountTon must be a positive number' });
    return;
  }
  const userId = req.user?.id ?? 0;
  if (getBalance(userId) < amount) {
    res.status(402).json({ error: 'insufficient balance' });
    return;
  }
  balances.set(userId, getBalance(userId) - amount);
  res.json({ balanceTon: getBalance(userId) });
});

// --- Payments (top-up intent → provider callback credits the balance) ---

app.post('/api/invoice', auth, (req: AuthedRequest, res: Response) => {
  const body = req.body as { amountTon?: unknown; provider?: unknown };
  const amount = Number(body?.amountTon);
  const provider = String(body?.provider ?? '');
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: 'amountTon must be a positive number' });
    return;
  }
  if (provider !== 'stars' && provider !== 'ton') {
    res.status(400).json({ error: "provider must be 'stars' or 'ton'" });
    return;
  }
  const invoice: Invoice = {
    id: randomUUID(),
    userId: req.user?.id ?? 0,
    amountTon: amount,
    provider,
    status: 'pending',
    payload: `topup:${amount}`,
  };
  invoices.set(invoice.id, invoice);
  // `link` is the intent the frontend hands to openInvoice (Stars) / TON Connect (TON).
  res.json({
    invoiceId: invoice.id,
    provider,
    amountTon: amount,
    payload: invoice.payload,
    link: `tg://invoice?slug=${invoice.id}`,
  });
});

app.post('/api/invoice/:id/pay', auth, (req: AuthedRequest, res: Response) => {
  // Simulates the provider's success callback: mark paid, credit the creator's balance.
  const invoice = invoices.get(req.params.id);
  if (!invoice) {
    res.status(404).json({ error: 'invoice not found' });
    return;
  }
  if (invoice.status === 'paid') {
    res.status(409).json({ error: 'invoice already paid' });
    return;
  }
  invoice.status = 'paid';
  balances.set(invoice.userId, getBalance(invoice.userId) + invoice.amountTon);
  res.json({
    invoiceId: invoice.id,
    status: invoice.status,
    balanceTon: getBalance(invoice.userId),
  });
});

// --- Settlement (semi on-chain): poll until the tx settles ---

app.get('/api/tx/:id', auth, (req: AuthedRequest, res: Response) => {
  const tx = txs.get(req.params.id);
  if (!tx) {
    res.status(404).json({ error: 'tx not found' });
    return;
  }
  const status = Date.now() - tx.createdAt >= SETTLE_MS ? 'settled' : 'pending';
  res.json({ txId: tx.id, status });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

/** Push live marketplace events to every connected Mini App (auctions / sold-out). */
function broadcast(message: unknown): void {
  const data = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(data);
  }
}

/** Best-effort cross-system delivery: DM the user via the Telegram Bot API (when NOTIFY=true). */
async function sendTelegram(chatId: number, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    // Notification is best-effort; never fail the purchase because the DM didn't go out.
  }
}

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] http://localhost:${PORT}  (DEV_MODE=${DEV_MODE})`);
});
