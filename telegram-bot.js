import "dotenv/config";
import { Bot } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";
import fs from "fs";
import path from "path";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID;

const bot = new Bot(TOKEN);
const userStates = new Map();

// প্রতিটা লুপে কনসোল লগ সহ গ্লোবাল ফোল্ডার সার্চ ফাংশন
function searchFoldersInDir(dir, keyword, results = [], maxResults = 15) {
  if (results.length >= maxResults) return;

  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (results.length >= maxResults) break;

      if (item.isDirectory()) {
        const folderName = item.name;
        const fullPath = path.join(dir, folderName);

        // লুপের প্রতিটি ফোল্ডার চেক করার সময় কনসোল লগ প্রিন্ট হবে
        console.log(`[LOOP SCAN] Checking folder: ${fullPath}`);

        if (folderName.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`[MATCH FOUND] 🎉 ${fullPath}`);
          results.push(fullPath);
        }

        try {
          searchFoldersInDir(fullPath, keyword, results, maxResults);
        } catch (subErr) {
          // পার্মিশন বা এক্সেস এরর সাইলেন্টলি স্কিপ করবে
        }
      }
    }
  } catch (err) {
    // রুট বা মেইন ডিরেক্টরি এক্সেস এরর ইগনোর করা হবে
  }
}

// "This PC" এর সব এভেইলেবল ড্রাইভ (C:\, D:\ ইত্যাদি) খুঁজে বের করার ফাংশন
function getAllAvailableDrives() {
  const drives = [];
  const possibleLetters = ["C", "D", "E", "F", "G", "H", "I", "J"];

  for (const letter of possibleLetters) {
    const drivePath = `${letter}:\\`;
    try {
      if (fs.existsSync(drivePath)) {
        drives.push(drivePath);
      }
    } catch (e) {}
  }
  return drives;
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

// /addprompt কমান্ড
bot.command("addprompt", async (ctx) => {
  const chatId = ctx.chat.id;
  console.log(`[CMD] /addprompt triggered by ${chatId}`);
  userStates.set(chatId, { command: "ADD_PROMPT", step: "WAITING_FOR_DIR" });

  await ctx.reply(
    "📂 *Step 1/2:* Please provide the target directory path (e.g., `C:\\Global-AI-Notifier`):",
    { parse_mode: "Markdown" },
  );
});

// /searchfolder কমান্ড
bot.command("searchfolder", async (ctx) => {
  const chatId = ctx.chat.id;
  console.log(`[CMD] /searchfolder triggered by ${chatId}`);
  userStates.set(chatId, { command: "SEARCH_FOLDER" });

  await ctx.reply(
    "🔍 Please provide the folder keyword to search globally across 'This PC':",
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

  // 2. SEARCH FOLDER FLOW (This PC গ্লোবাল সার্চ + টাইপিং অ্যানিমেশন)
  else if (state.command === "SEARCH_FOLDER") {
    const keyword = text.trim();
    userStates.delete(chatId);

    console.log(
      `[THIS_PC_SEARCH] Starting global search for keyword: "${keyword}" across all drives...`,
    );

    try {
      // টেলিগ্রামে টাইপিং অ্যানিমেশন দেখানোর জন্য sendChatAction ব্যবহার করা হলো
      await bot.api.sendChatAction({
        chat_id: chatId,
        action: "typing",
      });

      await ctx.reply(
        `🔍 Searching globally across 'This PC' for folders matching "*${keyword}*"... Please wait.`,
        { parse_mode: "Markdown" },
      );

      const drives = getAllAvailableDrives();
      console.log(`[DRIVES DETECTED]:`, drives);

      let matchedFolders = [];
      const maxLimit = 15;

      for (const drive of drives) {
        if (matchedFolders.length >= maxLimit) break;
        console.log(`[SCANNING DRIVE]: ${drive}`);
        searchFoldersInDir(drive, keyword, matchedFolders, maxLimit);
      }

      console.log(
        `[THIS_PC_SEARCH] Search completed. Total matched: ${matchedFolders.length}`,
      );

      if (matchedFolders.length === 0) {
        await ctx.reply(
          `⚠️ No matching folders found globally on 'This PC' for "*${keyword}*".`,
          { parse_mode: "Markdown" },
        );
      } else {
        let responseText = `📂 *This PC Search Results (${matchedFolders.length}):*\n\n`;
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
