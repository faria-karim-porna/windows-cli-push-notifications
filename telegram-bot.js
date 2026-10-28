import "dotenv/config";
import { Bot } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";
import fs from "fs";
import path from "path";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID;

const bot = new Bot(TOKEN);
const userStates = new Map();

// গ্লোবালি ফোল্ডার সার্চ করার ফাংশন (ডিফল্ট রুট C:\)
function searchFolders(dir, keyword, results = [], maxResults = 15) {
  if (results.length >= maxResults) return;
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (results.length >= maxResults) break;
      if (item.isDirectory()) {
        const folderName = item.name;
        const fullPath = path.join(dir, folderName);
        if (folderName.toLowerCase().includes(keyword.toLowerCase())) {
          results.push(fullPath);
        }
        try {
          searchFolders(fullPath, keyword, results, maxResults);
        } catch (subErr) {}
      }
    }
  } catch (err) {}
  return results;
}

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

// /addprompt কমান্ড (আগের মতোই থাকবে)
bot.command("addprompt", async (ctx) => {
  const chatId = ctx.chat.id;
  console.log(`[CMD] /addprompt triggered by ${chatId}`);
  userStates.set(chatId, { command: "ADD_PROMPT", step: "WAITING_FOR_DIR" });

  await ctx.reply(
    "📂 *Step 1/2:* Please provide the target directory path (e.g., `C:\\Global-AI-Notifier`):",
    { parse_mode: "Markdown" },
  );
});

// /searchfolder কমান্ড (এখন আর আলাদা করে ডিরেক্টরি চাইবে না, ডিরেক্ট কিউয়ার্ড নিবে)
bot.command("searchfolder", async (ctx) => {
  const chatId = ctx.chat.id;
  console.log(`[CMD] /searchfolder triggered by ${chatId}`);
  userStates.set(chatId, { command: "SEARCH_FOLDER" });

  await ctx.reply(
    "🔍 Please provide the folder keyword to search globally (e.g., `portfolio` or `Notifier`):",
    { parse_mode: "Markdown" },
  );
});

// সেন্ট্রাল মেসেজ লিসেনার
bot.on("message", async (ctx) => {
  const chatId = ctx.chat?.id || ctx.msg?.chat?.id;
  const text = ctx.msg?.text || ctx.update?.message?.text;

  if (!chatId || !text) return;

  if (text.startsWith("/")) return;

  const state = userStates.get(chatId);
  if (!state) return;

  // 1. ADD PROMPT FLOW
  if (state.command === "ADD_PROMPT") {
    if (state.step === "WAITING_FOR_DIR") {
      state.dirPath = text.trim();
      state.step = "WAITING_FOR_PROMPT";
      userStates.set(chatId, state);

      await ctx.reply(
        "✍️ *Step 2/2:* Great! Now please provide your prompt text:",
        { parse_mode: "Markdown" },
      );
    } else if (state.step === "WAITING_FOR_PROMPT") {
      const dirPath = state.dirPath;
      const promptText = text.trim();
      userStates.delete(chatId);

      try {
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        const mdFilePath = path.join(dirPath, "prompts.md");
        const fileExists = fs.existsSync(mdFilePath);
        const timestamp = new Date().toLocaleString();
        const markdownEntry = `- **Time:** ${timestamp}\n  - **Prompt:** ${promptText}\n\n`;

        fs.appendFileSync(mdFilePath, markdownEntry, "utf8");

        if (fileExists) {
          await ctx.reply(
            `ℹ️ **Note:** The \`prompts.md\` file already existed!\n\nThe new prompt has been appended:\n\`${mdFilePath}\``,
            { parse_mode: "Markdown" },
          );
        } else {
          await ctx.reply(
            `✅ **Success!**\n\nA new \`prompts.md\` file has been created:\n\`${mdFilePath}\``,
            { parse_mode: "Markdown" },
          );
        }
      } catch (error) {
        console.error(error);
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    }
  }

  // 2. SEARCH FOLDER FLOW (গ্লোবাল সার্চ - সরাসরি C:\ ড্রাইভ থেকে)
  else if (state.command === "SEARCH_FOLDER") {
    const keyword = text.trim();
    userStates.delete(chatId); // কাজ শেষ, স্টেট ক্লিয়ার করে দিলাম

    const baseDir = "C:\\"; // গ্লোবাল সার্চ রুট ড্রাইভ
    console.log(
      `[GLOBAL_SEARCH] Searching for keyword "${keyword}" across ${baseDir}...`,
    );

    try {
      await ctx.reply(
        `🔍 Globally searching for folders matching "*${keyword}*" across \`${baseDir}\`... Please wait.`,
        { parse_mode: "Markdown" },
      );

      const matchedFolders = searchFolders(baseDir, keyword);
      console.log(
        `[GLOBAL_SEARCH] Found folders count: ${matchedFolders.length}`,
      );

      if (matchedFolders.length === 0) {
        await ctx.reply(
          `⚠️ No matching folders found globally for "*${keyword}*".`,
          { parse_mode: "Markdown" },
        );
      } else {
        let responseText = `📂 *Global Search Results (${matchedFolders.length}):*\n\n`;
        matchedFolders.forEach((folder, index) => {
          responseText += `${index + 1}. \`${folder}\`\n`;
        });
        await ctx.reply(responseText, { parse_mode: "Markdown" });
      }
    } catch (error) {
      console.error(error);
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  }
});

async function start() {
  console.log("Starting bot...");
  await sendStartupMessage();
  console.log("Bot polling started...");
  await run(bot);
}

start();
