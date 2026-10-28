import "dotenv/config";
import { Bot } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";
import {
  registerAddPromptCommand,
  handleAddPromptFlow,
} from "./commands/addPrompt.js";
import {
  registerSearchFolderCommand,
  handleSearchFolderFlow,
} from "./commands/searchFolder.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID;

const bot = new Bot(TOKEN);
const userStates = new Map();

async function sendStartupMessage() {
  try {
    console.log("Sending startup message to owner...");
    await bot.api.sendMessage({
      chat_id: OWNER_CHAT_ID,
      text: "🚀 *Global AI Notifier Bot is online and running successfully!*",
      parse_mode: "Markdown",
    });
    console.log("Startup message sent successfully.");
  } catch (err) {
    console.error("Failed to send startup message:", err.message);
  }
}

// কমান্ডগুলো রেজিস্টার করা হচ্ছে
registerAddPromptCommand(bot, userStates);
registerSearchFolderCommand(bot, userStates);

// সেন্ট্রাল মেসেজ লিসেনার (স্টেট অনুযায়ী নির্দিষ্ট মডিউলে হ্যান্ডলার কল করবে)
bot.on("message", async (ctx) => {
  const chatId = ctx.chat?.id || ctx.msg?.chat?.id;
  const text = ctx.msg?.text || ctx.update?.message?.text;

  if (!chatId || !text) return;
  if (text.startsWith("/")) return;

  const state = userStates.get(chatId);
  if (!state) return;

  if (state.command === "ADD_PROMPT") {
    await handleAddPromptFlow(ctx, chatId, text, state, userStates);
  } else if (state.command === "SEARCH_FOLDER") {
    await handleSearchFolderFlow(ctx, chatId, text, userStates, bot);
  }
});

async function start() {
  console.log("Starting bot...");
  await sendStartupMessage();
  console.log("Bot polling started...");
  await run(bot);
}

start();
