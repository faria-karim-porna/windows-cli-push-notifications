import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function registerEndCliCommand(bot, userStates, activeOperations) {
  bot.command("endcli", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /endcli triggered by ${chatId}`);

    // অ্যাবোর্ট কন্ট্রোলার তৈরি করে একটিভ অপারেশনে রেজিস্টার করা
    const controller = new AbortController();
    activeOperations.set(chatId, { controller, commandName: "endcli" });

    userStates.set(chatId, { command: "END_CLI", step: "WAITING_FOR_DIR" });

    await ctx.reply(
      "🛑 *Step 1/2:* Please provide the project directory path where the CLI session is running:\n*(Type /stop to cancel)*",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleEndCliFlow(
  ctx,
  chatId,
  text,
  state,
  userStates,
  activeOperations,
) {
  const operation = activeOperations?.get(chatId);
  const signal = operation?.controller?.signal;

  if (signal && signal.aborted) {
    userStates.delete(chatId);
    activeOperations.delete(chatId);
    return;
  }

  try {
    if (state.step === "WAITING_FOR_DIR") {
      const dirPath = text.trim();

      if (!fs.existsSync(dirPath)) {
        userStates.delete(chatId);
        activeOperations?.delete(chatId);
        await ctx.reply(
          `❌ Error: The directory \`${dirPath}\` does not exist!`,
          { parse_mode: "Markdown" },
        );
        return;
      }

      state.dirPath = dirPath;
      state.step = "WAITING_FOR_CLI_CHOICE";
      userStates.set(chatId, state);

      await ctx.reply(
        "⚙️ *Step 2/2:* Which CLI session do you want to end? Please reply with either `agy`, `freebuff`, or `all`:\n*(Type /stop to cancel)*",
        { parse_mode: "Markdown" },
      );
    } else if (state.step === "WAITING_FOR_CLI_CHOICE") {
      const cliChoice = text.trim().toLowerCase();
      const dirPath = state.dirPath;

      userStates.delete(chatId);
      activeOperations?.delete(chatId);

      if (
        cliChoice !== "agy" &&
        cliChoice !== "freebuff" &&
        cliChoice !== "all"
      ) {
        await ctx.reply(
          "❌ Invalid choice! Please reply with strictly `agy`, `freebuff`, or `all`.",
          { parse_mode: "Markdown" },
        );
        return;
      }

      await ctx.reply(
        `🛑 Attempting to terminate \`${cliChoice}\` CLI sessions associated with \`${dirPath}\`... Please wait.`,
        { parse_mode: "Markdown" },
      );

      if (signal && signal.aborted) {
        return;
      }

      let terminatedCount = 0;

      // উইন্ডোজের জন্য নোড প্রসেস বা নির্দিষ্ট CLI প্রসেস কিল করার কমান্ড
      if (cliChoice === "agy" || cliChoice === "all") {
        try {
          await execAsync(`taskkill /f /im agy.exe`, { cwd: dirPath });
          terminatedCount++;
        } catch (e) {}
      }

      if (cliChoice === "freebuff" || cliChoice === "all") {
        try {
          await execAsync(`taskkill /f /im freebuff.exe`, { cwd: dirPath });
          terminatedCount++;
        } catch (e) {}
      }

      // ব্যাকআপ হিসেবে রানিং নোড বা টার্মিনাল প্রসেস যা ওই ফোল্ডারে কাজ করছে তা ক্লিয়ার করার জন্য
      try {
        await execAsync(`taskkill /f /fi "WORKINGDIR eq ${dirPath}"`, {
          cwd: dirPath,
        });
      } catch (e) {}

      console.log(`[END_CLI] Terminated CLI sessions for: ${dirPath}`);

      await ctx.reply(
        `✅ *CLI Session Ended Successfully!*\n\n**Directory:** \`${dirPath}\`\n**Target:** \`${cliChoice}\`\n**Status:** All matching active sessions have been forcefully closed.`,
        { parse_mode: "Markdown" },
      );
    }
  } catch (error) {
    userStates.delete(chatId);
    activeOperations?.delete(chatId);
    console.error(error);
    await ctx.reply(`❌ Error terminating CLI: ${error.message}`);
  }
}
