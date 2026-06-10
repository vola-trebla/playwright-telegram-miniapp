import 'dotenv/config';
import { Bot, InlineKeyboard } from 'grammy';

// The bot's only job: be the door into the Mini App. /start replies with an inline
// `web_app` button that opens WEBAPP_URL inside Telegram's webview — that webview is
// our apps/backend/public Mini App, which then reads window.Telegram.WebApp.initData.
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL ?? 'http://localhost:3000';

if (!BOT_TOKEN) {
  throw new Error(
    'BOT_TOKEN is required — create a bot via @BotFather and set it in apps/bot/.env',
  );
}

const bot = new Bot(BOT_TOKEN);

bot.command('start', async (ctx) => {
  // Telegram requires HTTPS for web_app buttons (test environment allows HTTP/IP).
  const keyboard = new InlineKeyboard().webApp('🎁 Open MRKT', WEBAPP_URL);
  await ctx.reply('MRKT — gift marketplace. Tap to open the Mini App:', {
    reply_markup: keyboard,
  });
});

bot.catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[bot] error:', err);
});

await bot.start({
  onStart: (me) => {
    // eslint-disable-next-line no-console
    console.log(`[bot] @${me.username} running. WebApp URL: ${WEBAPP_URL}`);
  },
});
