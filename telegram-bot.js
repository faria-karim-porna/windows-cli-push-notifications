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
import {
  registerSearchFileCommand,
  handleSearchFileFlow,
} from "./commands/searchFile.js";
import {
  registerUpdatePromptCommand,
  handleUpdatePromptFlow,
} from "./commands/updatePrompt.js";
import { registerRunCliCommand, handleRunCliFlow } from "./commands/runCli.js";
import {
  registerCurrentCliCommand,
  handleCurrentCliFlow,
} from "./commands/currentCli.js";
import { registerEndCliCommand, handleEndCliFlow } from "./commands/endCli.js";
import {
  registerCloseCodeCommand,
  handleCloseCodeFlow,
} from "./commands/closeCode.js";
import {
  registerNavigatePathCommand,
  registerNavigateCallback,
} from "./commands/navigateToPath.js";
import {
  registerSwitchModelCommand,
  handleSwitchModelFlow,
  registerSwitchModelCallback,
} from "./commands/switchModel.js";
import {
  registerCurrentUsageCommand,
  handleCurrentUsageFlow,
} from "./commands/currentUsage.js";
import {
  registerSwitchUserCommand,
  handleSwitchUserFlow,
} from "./commands/switchUser.js";
import {
  registerCurrentUserCommand,
  handleCurrentUserFlow,
} from "./commands/currentUser.js";
import { registerStopCommand } from "./commands/stop.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID;

const bot = new Bot(TOKEN);
const userStates = new Map();
const activeOperations = new Map(); // সেন্ট্রাল ম্যাপ যা সব চলমান অপারেশন ট্র্যাক করবে

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
registerSearchFileCommand(bot, userStates);
registerUpdatePromptCommand(bot, userStates);
registerRunCliCommand(bot, userStates);
registerCurrentCliCommand(bot, userStates);
registerEndCliCommand(bot, userStates);
registerCloseCodeCommand(bot, userStates);
registerNavigatePathCommand(bot, userStates);
registerNavigateCallback(bot);
registerSwitchModelCommand(bot, userStates);
registerSwitchModelCallback(bot);
registerCurrentUsageCommand(bot, userStates);
registerSwitchUserCommand(bot, userStates);
registerCurrentUserCommand(bot, userStates);
registerStopCommand(bot, activeOperations); // /stop কমান্ড রেজিস্টার করা হলো

// সেন্ট্রাল মেসেজ লিসেনার
bot.on("message", async (ctx) => {
  const chatId = ctx.chat?.id || ctx.msg?.chat?.id;
  const text = ctx.msg?.text || ctx.update?.message?.text;

  if (chatId.toString() !== OWNER_CHAT_ID.toString()) {
    return;
  }

  if (!chatId || !text) return;
  if (text.startsWith("/")) return;

  const state = userStates.get(chatId);
  if (!state) return;

  // প্রতিটি ফ্লো হ্যান্ডলারে activeOperations পাস করা হয়েছে যাতে দরকার পড়লে /stop দিয়ে থামানো যায়
  if (state.command === "ADD_PROMPT") {
    await handleAddPromptFlow(
      ctx,
      chatId,
      text,
      state,
      userStates,
      activeOperations,
    );
  } else if (state.command === "SEARCH_FOLDER") {
    await handleSearchFolderFlow(
      ctx,
      chatId,
      text,
      userStates,
      bot,
      activeOperations,
    );
  } else if (state.command === "SEARCH_FILE") {
    await handleSearchFileFlow(
      ctx,
      chatId,
      text,
      userStates,
      bot,
      activeOperations,
    );
  } else if (state.command === "UPDATE_PROMPT") {
    await handleUpdatePromptFlow(
      ctx,
      chatId,
      text,
      state,
      userStates,
      activeOperations,
    );
  } else if (state.command === "RUN_CLI") {
    await handleRunCliFlow(
      ctx,
      chatId,
      text,
      state,
      userStates,
      bot,
      activeOperations,
    );
  } else if (state.command === "CURRENT_CLI") {
    await handleCurrentCliFlow(
      ctx,
      chatId,
      text,
      state,
      userStates,
      activeOperations,
    );
  } else if (state.command === "END_CLI") {
    await handleEndCliFlow(
      ctx,
      chatId,
      text,
      state,
      userStates,
      activeOperations,
    );
  } else if (state.command === "CLOSE_CODE") {
    await handleCloseCodeFlow(
      ctx,
      chatId,
      text,
      state,
      userStates,
      activeOperations,
    );
  } else if (state.command === "SWITCH_MODEL") {
    await handleSwitchModelFlow(
      ctx,
      chatId,
      text,
      state,
      userStates,
      activeOperations,
    );
  } else if (state.command === "CURRENT_USAGE") {
    await handleCurrentUsageFlow(
      ctx,
      chatId,
      text,
      state,
      userStates,
      activeOperations,
    );
  } else if (state.command === "SWITCH_USER") {
    await handleSwitchUserFlow(
      ctx,
      chatId,
      text,
      state,
      userStates,
      activeOperations,
    );
  } else if (state.command === "CURRENT_USER") {
    await handleCurrentUserFlow(
      ctx,
      chatId,
      text,
      state,
      userStates,
      activeOperations,
    );
  }
});

async function start() {
  console.log("Starting bot...");
  await sendStartupMessage();
  console.log("Bot polling started...");
  await run(bot);
}

start();
