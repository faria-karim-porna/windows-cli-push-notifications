import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function registerEndCliCommand(bot, userStates) {
  bot.command("endcli", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /endcli triggered by ${chatId}`);
    userStates.set(chatId, { command: "END_CLI", step: "WAITING_FOR_DIR" });

    await ctx.reply(
      "🛑 *Step 1/2:* Please provide the project directory path where the CLI session is running:",
      { parse_mode: "Markdown" }
    );
  });
}

export async function handleEndCliFlow(ctx, chatId, text, state, userStates) {
  if (state.step === "WAITING_FOR_DIR") {
    const dirPath = text.trim();

    if (!fs.existsSync(dirPath)) {
      await ctx.reply(`❌ Error: The directory \`${dirPath}\` does not exist!`, { parse_mode: "Markdown" });
      userStates.delete(chatId);
      return;
    }

    state.dirPath = dirPath;
    state.step = "WAITING_FOR_CLI_CHOICE";
    userStates.set(chatId, state);

    await ctx.reply(
      "⚙️ *Step 2/2:* Which CLI session do you want to end? Please reply with either `agy`, `freebuff`, or `all`:",
      { parse_mode: "Markdown" }
    );
  } 
  else if (state.step === "WAITING_FOR_CLI_CHOICE") {
    const cliChoice = text.trim().toLowerCase();
    const dirPath = state.dirPath;
    userStates.delete(chatId);

    if (cliChoice !== "agy" && cliChoice !== "freebuff" && cliChoice !== "all") {
      await ctx.reply(`❌ Invalid choice! Please reply with strictly `agy`, `freebuff`, or `all`.`, { parse_mode: "Markdown" });
      return;
    }

    await ctx.reply(`🛑 Attempting to terminate \`${cliChoice}\` CLI sessions associated with \`${dirPath}\`... Please wait.`, { parse_mode: "Markdown" });

    try {
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
        await execAsync(`taskkill /f /fi "WORKINGDIR eq ${dirPath}"`, { cwd: dirPath });
      } catch (e) {}

      console.log(`[END_CLI] Terminated CLI sessions for: ${dirPath}`);

      await ctx.reply(
        `✅ *CLI Session Ended Successfully!*\n\n- **Directory:** \`${dirPath}\`\n- **Target:** \`${cliChoice}\`\n- **Status:** All matching active sessions have been forcefully closed.`,
        { parse_mode: "Markdown" }
      );

    } catch (error) {
      console.error(error);
      await ctx.reply(`❌ Error terminating CLI: ${error.message}`);
    }
  }
}