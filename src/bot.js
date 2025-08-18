import mineflayer from 'mineflayer';
import { fetch } from 'undici';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

// ----------- 環境変数 -----------
const HOST = process.env.HOST || 'localhost';
const MC_PORT = parseInt(process.env.PORT || '25565', 10);
const BOT_NAME = process.env.BOT_NAME || 'MineBOT';
const SERVER_VERSION = process.env.SERVER_VERSION || '1.20.1';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const WEB_PORT = parseInt(process.env.WEB_PORT || '3000', 10);

let bot;

// ----------- AFK回避ランダム動作 -----------
function randomMove(bot) {
  const directions = ['forward', 'back', 'left', 'right'];
  const dir = directions[Math.floor(Math.random() * directions.length)];
  bot.setControlState(dir, true);
  setTimeout(() => bot.setControlState(dir, false), Math.random() * 2000 + 500);

  if (Math.random() < 0.5) {
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 500);
  }

  bot.look(Math.random() * 360, Math.random() * 90 - 45, true);
  setTimeout(() => randomMove(bot), 3000);
}

// ----------- Bot 作成・接続 -----------
function createBot() {
  bot = mineflayer.createBot({
    host: HOST,
    port: MC_PORT,
    username: BOT_NAME,
    version: SERVER_VERSION
  });

  bot.on('login', () => {
    console.log(`[BOT] ${BOT_NAME} がサーバーに接続しました`);
    randomMove(bot);
  });

  bot.on('playerJoined', async (player) => {
    console.log(`[BOT] ${player.username} が参加`);
    if (DISCORD_WEBHOOK_URL) {
      try {
        await fetch(DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `✅ プレイヤー参加: ${player.username}` })
        });
      } catch (err) {
        console.error('[Discord通知] 失敗:', err);
      }
    }
  });

  bot.on('playerLeft', async (player) => {
    console.log(`[BOT] ${player.username} が退出`);
    if (DISCORD_WEBHOOK_URL) {
      try {
        await fetch(DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `❌ プレイヤー退出: ${player.username}` })
        });
      } catch (err) {
        console.error('[Discord通知] 失敗:', err);
      }
    }
  });

  bot.on('chat', (username, message) => {
    console.log(`[CHAT] <${username}> ${message}`);
  });

  bot.on('error', (err) => {
    console.error('[BOTエラー]', err);
  });

  bot.on('end', () => {
    console.warn('[WARN] BOT切断、5秒後に再接続します...');
    setTimeout(createBot, 5000);
  });
}

// ----------- HTTPサーバー（監視用） -----------
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'running', bot: BOT_NAME }));
}).listen(WEB_PORT, () => {
  console.log(`[WEB] サーバー稼働中: http://localhost:${WEB_PORT}`);
});

// ----------- Bot起動 -----------
createBot();
