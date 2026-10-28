import { Bot } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";
import fs from "fs";
import path from "path";

const TOKEN = "9284805212:AAHuvsDFHbvbnN9VRYNcDydd4g8DILL5Pm8";
const OWNER_CHAT_ID = "1507591006";

// নতুন v2 সিনট্যাক্স অনুযায়ী Bot ইনিশিয়ালাইজ করা
const bot = new Bot(TOKEN);

// বট রান হওয়ার সাথে সাথে নোটিফিকেশন পাঠানোর জন্য একটি ফাংশন
async function sendStartupMessage() {
  try {
    await bot.api.sendMessage({
      chat_id: OWNER_CHAT_ID,
      text: "🚀 *Global AI Notifier Bot is online and running successfully!*",
      parse_mode: "Markdown",
    });
    console.log("Startup message sent to Telegram successfully.");
  } catch (err) {
    console.error("Failed to send startup message:", err.message);
  }
}

// কমান্ড হ্যান্ডলার: /addprompt <directory-path> | <banglish-prompt>
bot.command("addprompt", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.msg.text;

  // /addprompt কমান্ডের পরের অংশটুকু নেওয়া
  const match = text.match(/\/addprompt\s+(.+)/);
  if (!match) {
    await ctx.reply(
      "⚠️ Please use the correct command format!\n\nUsage: `/addprompt <directory-path> | <banglish-prompt>`",
      { parse_mode: "Markdown" },
    );
    return;
  }

  const input = match[1];
  const parts = input.split("|");
  if (parts.length < 2) {
    await ctx.reply(
      "⚠️ Please use the correct command format!\n\nUsage: `/addprompt <directory-path> | <banglish-prompt>`",
      { parse_mode: "Markdown" },
    );
    return;
  }

  const dirPath = parts[0].trim();
  const promptText = parts[1].trim();

  try {
    // ১. ডিরেক্টরি না থাকলে তৈরি করা
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const mdFilePath = path.join(dirPath, "prompts.md");
    const fileExists = fs.existsSync(mdFilePath);

    const timestamp = new Date().toLocaleString();
    const markdownEntry = `- **Time:** ${timestamp}\n  - **Prompt:** ${promptText}\n\n`;

    // ফাইলে প্রম্পট অ্যাপেন্ড করা
    fs.appendFileSync(mdFilePath, markdownEntry, "utf8");

    // রেসপন্স পাঠানো
    if (fileExists) {
      await ctx.reply(
        `ℹ️ **Note:** The \`prompts.md\` file already existed!\n\nThe new prompt has been appended to the existing file list:\n\`${mdFilePath}\``,
        { parse_mode: "Markdown" },
      );
    } else {
      await ctx.reply(
        `✅ **Success!**\n\nA new \`prompts.md\` file has been created and the prompt was added:\n\`${mdFilePath}\``,
        { parse_mode: "Markdown" },
      );
    }
  } catch (error) {
    console.error(error);
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});

// বট চালু করা এবং স্টার্টআপ মেসেজ পাঠানো
async function start() {
  await sendStartupMessage();
  console.log("Bot is polling for updates...");
  await run(bot); // Managed runner (Graceful Ctrl-C support)
}

start();
