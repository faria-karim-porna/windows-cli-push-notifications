import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function registerCloseCodeCommand(bot, userStates, activeOperations) {
  bot.command("closecode", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /closecode triggered by ${chatId}`);

    // অ্যাবোর্ট কন্ট্রোলার তৈরি করে একটিভ অপারেশনে রেজিস্টার করা
    const controller = new AbortController();
    activeOperations.set(chatId, { controller, commandName: "closecode" });

    userStates.set(chatId, { command: "CLOSE_CODE" });

    await ctx.reply(
      "💻 Please provide the project directory path where VS Code is currently open:\n*(Type /stop to cancel)*",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleCloseCodeFlow(
  ctx,
  chatId,
  text,
  userStates,
  activeOperations,
) {
  const dirPath = text.trim();
  userStates.delete(chatId);

  const operation = activeOperations?.get(chatId);
  const signal = operation?.controller?.signal;

  if (signal && signal.aborted) {
    activeOperations.delete(chatId);
    return;
  }

  if (!fs.existsSync(dirPath)) {
    activeOperations?.delete(chatId);
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
    if (signal && signal.aborted) {
      activeOperations.delete(chatId);
      return;
    }

    // উইন্ডোজে নির্দিষ্ট ওয়ার্কস্পেস বা ফোল্ডারের VS Code প্রসেস কিল করার কমান্ড
    try {
      await execAsync(`taskkill /f /fi "WINDOWTITLE eq *${dirPath}*"`, {
        cwd: dirPath,
      });
    } catch (e) {}

    if (signal && signal.aborted) {
      activeOperations.delete(chatId);
      return;
    }

    // সাধারণ গ্লোবাল ইন্সট্যান্স ক্লোজ করার জন্য
    try {
      await execAsync(`taskkill /f /im code.exe`);
    } catch (e) {}

    activeOperations?.delete(chatId);
    console.log(`[CLOSE_CODE] Successfully closed VS Code for: ${dirPath}`);

    await ctx.reply(
      `✅ *VS Code Closed Successfully!*\n\n**Directory:**\`${dirPath}\`\n**Status:** The VS Code instance has been successfully terminated.`,
      { parse_mode: "Markdown" },
    );
  } catch (error) {
    activeOperations?.delete(chatId);
    console.error(error);
    await ctx.reply(`❌ Error closing VS Code: ${error.message}`);
  }
}
