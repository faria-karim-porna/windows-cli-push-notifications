const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");

const token = "9284805212:AAHuvsDFHbvbnN9VRYNcDydd4g8DILL5Pm8";
const bot = new TelegramBot(token, { polling: true });

// আপনার নিজস্ব টেলিগ্রাম চ্যাট আইডি এখানে বসিয়ে দিন (যেমন: 123456789)
const OWNER_CHAT_ID = "8625032311";

// বট রান হওয়ার সাথে সাথে মেসেজ পাঠানোর কোড
bot
  .sendMessage(
    OWNER_CHAT_ID,
    "🚀 **Global AI Notifier Bot is online and running successfully!**",
    { parse_mode: "Markdown" },
  )
  .then(() => {
    console.log("Startup message sent to Telegram successfully.");
  })
  .catch((err) => {
    console.error("Failed to send startup message:", err.message);
  });

// Command format: /addprompt <directory-path> | <banglish-prompt>
bot.onText(/\/addprompt (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1];

  const parts = input.split("|");
  if (parts.length < 2) {
    bot.sendMessage(
      chatId,
      "⚠️ Please use the correct command format!\n\nUsage: `/addprompt <directory-path> | <banglish-prompt>`",
      { parse_mode: "Markdown" },
    );
    return;
  }

  const dirPath = parts[0].trim();
  const promptText = parts[1].trim();

  try {
    // ১. ডিরেক্টরি না থাকলে তৈরি করে নেওয়া
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const mdFilePath = path.join(dirPath, "prompts.md");
    const fileExists = fs.existsSync(mdFilePath);

    const timestamp = new Date().toLocaleString();
    const markdownEntry = `- **Time:** ${timestamp}\n  - **Prompt:** ${promptText}\n\n`;

    // ফাইলে প্রম্পট অ্যাপেন্ড করা
    fs.appendFileSync(mdFilePath, markdownEntry, "utf8");

    // ফাইল আগে থেকেই থাকলে বা নতুন তৈরি হলে মেসেজ পাঠানো
    if (fileExists) {
      bot.sendMessage(
        chatId,
        `ℹ️ **Note:** The \`prompts.md\` file already existed!\n\nThe new prompt has been appended to the existing file list:\n\`${mdFilePath}\``,
        { parse_mode: "Markdown" },
      );
    } else {
      bot.sendMessage(
        chatId,
        `✅ **Success!**\n\nA new \`prompts.md\` file has been created and the prompt was added:\n\`${mdFilePath}\``,
        { parse_mode: "Markdown" },
      );
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
});
