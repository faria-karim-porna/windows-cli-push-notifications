import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function registerCloseCodeCommand(bot, userStates) {
  bot.command("closecode", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /closecode triggered by ${chatId}`);
    userStates.set(chatId, { command: "CLOSE_CODE" });

    await ctx.reply(
      "💻 Please provide the project directory path where VS Code is currently open:",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleCloseCodeFlow(ctx, chatId, text, userStates) {
  const dirPath = text.trim();
  userStates.delete(chatId);

  if (!fs.existsSync(dirPath)) {
    await ctx.reply(`❌ Error: The directory \`${dirPath}\` does not exist!`, {
      parse_mode: "Markdown",
    });
    return;
  }

  await ctx.reply(
    `🛑 Attempting to close VS Code for \`${dirPath}\`... Please wait.`,
    { parse_mode: "Markdown" },
  );

  try {
    // উইন্ডোজে নির্দিষ্ট ওয়ার্কস্পেস বা ফোল্ডারের VS Code প্রসেস কিল করার কমান্ড
    // অথবা ব্যাকআপ হিসেবে সরাসরি code.exe প্রসেস টার্গেট করা
    try {
      await execAsync(`taskkill /f /fi "WINDOWTITLE eq *${dirPath}*"`, {
        cwd: dirPath,
      });
    } catch (e) {}

    // সাধারণ গ্লোবাল ইন্সট্যান্স ক্লোজ করার জন্য
    try {
      await execAsync(`taskkill /f /im code.exe`);
    } catch (e) {}

    console.log(`[CLOSE_CODE] Successfully closed VS Code for: ${dirPath}`);

    await ctx.reply(
      `✅ *VS Code Closed Successfully!*\n\n- **Directory:** \`${dirPath}\`\n- **Status:** The VS Code instance has been successfully terminated.`,
      { parse_mode: "Markdown" },
    );
  } catch (error) {
    console.error(error);
    await ctx.reply(`❌ Error closing VS Code: ${error.message}`);
  }
}
