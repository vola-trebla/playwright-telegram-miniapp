// Mini App client. A Telegram Mini App is just a web app in a webview: it reads
// window.Telegram.WebApp.initData and sends it to the backend on every request.
// In a plain browser initData is empty, and the backend's DEV_MODE lets us through.

const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand?.();

const initData = tg?.initData ?? '';
const headers = {
  'Content-Type': 'application/json',
  'X-Telegram-Init-Data': initData,
};

const whoEl = document.getElementById('who');
const gridEl = document.getElementById('grid');
const filtersEl = document.getElementById('filters');
const logEl = document.getElementById('log');

const RARITIES = ['all', 'common', 'rare', 'epic', 'legendary'];
let currentGifts = [];
let activeRarity = 'all';

function logLine(text) {
  const line = document.createElement('div');
  line.className = 'log-line';
  line.textContent = text;
  logEl.prepend(line);
}

async function loadMe() {
  const res = await fetch('/api/me', { headers });
  const { user } = await res.json();
  whoEl.textContent = user ? `${user.first_name ?? 'user'} (id ${user.id})` : 'unknown';
}

function soldLabel(buyer) {
  return buyer ? `SOLD → ${buyer}` : 'SOLD';
}

function card(gift) {
  const el = document.createElement('article');
  el.className = `card ${gift.status}`;
  el.dataset.id = gift.id;
  el.dataset.rarity = gift.rarity;
  el.innerHTML = `
    <div class="rarity ${gift.rarity}">${gift.rarity}</div>
    <div class="name">${gift.name}</div>
    <div class="price">${gift.priceTon} TON</div>
    <button data-test="buy" ${gift.status === 'sold' ? 'disabled' : ''}>
      ${gift.status === 'sold' ? soldLabel(gift.soldTo) : 'Buy'}
    </button>`;
  el.querySelector('button').addEventListener('click', () => buy(gift.id));
  return el;
}

function renderFilters() {
  filtersEl.innerHTML = '';
  for (const rarity of RARITIES) {
    const chip = document.createElement('button');
    chip.className = `chip ${rarity === activeRarity ? 'active' : ''}`;
    chip.dataset.test = `filter-${rarity}`;
    chip.textContent = rarity;
    chip.addEventListener('click', () => {
      activeRarity = rarity;
      renderFilters();
      renderGifts();
    });
    filtersEl.append(chip);
  }
}

function renderGifts() {
  const list =
    activeRarity === 'all' ? currentGifts : currentGifts.filter((g) => g.rarity === activeRarity);
  gridEl.innerHTML = '';
  for (const gift of list) gridEl.append(card(gift));
}

async function loadGifts() {
  const res = await fetch('/api/gifts', { headers });
  const { gifts } = await res.json();
  currentGifts = gifts;
  renderGifts();
}

async function buy(id) {
  const res = await fetch('/api/buy', {
    method: 'POST',
    headers,
    body: JSON.stringify({ id }),
  });
  const data = await res.json();
  if (!res.ok) {
    logLine(`buy failed: ${data.error} (${res.status})`);
    tg?.HapticFeedback?.notificationOccurred?.('error');
    return;
  }
  logLine(`you bought ${data.gift.name}`);
}

// Keep local state + DOM in sync when the server broadcasts a sale.
function markSold(id, buyer) {
  const gift = currentGifts.find((g) => g.id === id);
  if (gift) {
    gift.status = 'sold';
    gift.soldTo = buyer;
  }
  renderGifts();
}

// Live marketplace events (the auction / sold-out channel).
const ws = new WebSocket(`${location.origin.replace(/^http/, 'ws')}/ws`);
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'sold') {
    markSold(msg.id, msg.buyer);
    logLine(`live: ${msg.id} sold to ${msg.buyer}`);
  }
});

renderFilters();
loadMe();
loadGifts();
