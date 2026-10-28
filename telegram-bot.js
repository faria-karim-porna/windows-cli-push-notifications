import "dotenv/config"; // .env ফাইল লোড করার জন্য
import { Bot } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";
import fs from "fs";
import path from "path";

// .env ফাইল থেকে ভ্যালুগুলো রিড করা হচ্ছে
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID;

// নতুন v2 সিনট্যাক্স অনুযায়ী Bot ইনিশিয়ালাইজ করা
const bot = new Bot(TOKEN);

// ইউজারের কারেন্ট স্টেট ট্র্যাক করার জন্য একটি ম্যাপ (যেমন: কে ডিরেক্টরি দিচ্ছে নাকি প্রম্পট দিচ্ছে)
const userStates = new Map();

// বট রান হওয়ার সাথে সাথে নোটিফিকেশন পাঠানোর জন্য একটি ফাংশন
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

// কমান্ড হ্যান্ডলার: /addprompt লেখার পর স্টেপ-বাই-স্টেপ প্রসেস শুরু হবে
bot.command("addprompt", async (ctx) => {
  const chatId = ctx.chat.id;

  // ইউজারের স্টেট সেট করলাম যে সে এখন ডিরেক্টরি পাথ দেবে
  userStates.set(chatId, { step: "WAITING_FOR_DIR" });

  await ctx.reply(
    "📂 *Step 1/2:* Please provide the target directory path (e.g., `C:\\Global-AI-Notifier\\tasks`):",
    { parse_mode: "Markdown" },
  );
});

// সাধারণ টেক্সট মেসেজ হ্যান্ডেল করার জন্য listener (ধাপগুলো হ্যান্ডেল করবে)
bot.on("message", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.msg.text;

  // যদি ইউজার কোনো কমান্ড দেয় (যেমন: /start বা /addprompt), তবে টেক্সট লজিক ইগনোর করব
  if (!text || text.startsWith("/")) return;

  const state = userStates.get(chatId);
  if (!state) return; // যদি ইউজারের কোনো অ্যাক্টিভ স্টেট না থাকে

  if (state.step === "WAITING_FOR_DIR") {
    // ডিরেক্টরি পাথ রিসিভ করা হলো, এখন প্রম্পট চাওয়া হবে
    state.dirPath = text.trim();
    state.step = "WAITING_FOR_PROMPT";
    userStates.set(chatId, state);

    await ctx.reply(
      "✍️ *Step 2/2:* Great! Now please provide your prompt text:",
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "WAITING_FOR_PROMPT") {
    // প্রম্পট টেক্সট রিসিভ করা হলো, এবার ফাইল প্রসেসিং শুরু হবে
    const dirPath = state.dirPath;
    const promptText = text.trim();

    // কাজ শেষের পর ইউজারের স্টেট ক্লিয়ার করে দিলাম
    userStates.delete(chatId);

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
  }
});

// বট চালু করা এবং স্টার্টআপ মেসেজ পাঠানো
async function start() {
  await sendStartupMessage();
  console.log("Bot is polling for updates...");
  await run(bot); // Managed runner (Graceful Ctrl-C support)
}

start();
