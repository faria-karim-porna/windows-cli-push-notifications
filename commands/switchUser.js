import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function registerSwitchUserCommand(bot, userStates, activeOperations) {
  bot.command("switchuser", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /switchuser triggered by ${chatId}`);

    // অ্যাবোর্ট কন্ট্রোলার তৈরি করে একটিভ অপারেশনে রেজিস্টার করা
    const controller = new AbortController();
    activeOperations.set(chatId, { controller, commandName: "switchuser" });

    userStates.set(chatId, { command: "SWITCH_USER", step: "WAITING_FOR_DIR" });

    await ctx.reply(
      "👤 *Step 1/2:* Please provide your project directory path where the CLI tool is configured:\n*(Type /stop to cancel)*",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleSwitchUserFlow(
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
    activeOperations?.delete(chatId);
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

      if (signal && signal.aborted) {
        userStates.delete(chatId);
        activeOperations?.delete(chatId);
        return;
      }

      await ctx.reply(
        "⚙️ *Step 2/2:* Which CLI tool user do you want to switch? Please reply with either `agy` or `freebuff`:\n*(Type /stop to cancel)*",
        { parse_mode: "Markdown" },
      );
    } else if (state.step === "WAITING_FOR_CLI_CHOICE") {
      const cliChoice = text.trim().toLowerCase();
      const dirPath = state.dirPath;

      userStates.delete(chatId);
      activeOperations?.delete(chatId);

      if (cliChoice !== "agy" && cliChoice !== "freebuff") {
        await ctx.reply(
          `❌ Invalid choice! Please reply with strictly \`agy\` or \`freebuff\`.`,
          { parse_mode: "Markdown" },
        );
        return;
      }

      if (signal && signal.aborted) {
        return;
      }

      await ctx.reply(
        `🔄 Initiating user switch for \`${cliChoice}\` in \`${dirPath}\`...\n\nLogging out and opening Chrome for new login... Please check your browser.`,
        { parse_mode: "Markdown" },
      );

      // ১. প্রথমে বর্তমান সেশন লগআউট বা ক্যাশ ক্লিয়ার করার কমান্ড রান করা
      try {
        await execAsync(`${cliChoice} logout`, { cwd: dirPath });
      } catch (e) {}

      if (signal && signal.aborted) {
        return;
      }

      // ২. ক্রোম ব্রাউজার ব্যবহার করে নতুন ইউজার হিসেবে লগইন করার কমান্ড রান করা
      await execAsync(`${cliChoice} login`, {
        cwd: dirPath,
      });

      console.log(
        `[SWITCH_USER] Successfully triggered login for ${cliChoice}`,
      );

      await ctx.reply(
        `✅ *User Switch Triggered Successfully!*\n\n**CLI Tool:** \`${cliChoice}\`\n**Status:** Previous session cleared. Please complete the login in the opened Chrome browser window.`,
        { parse_mode: "Markdown" },
      );
    }
  } catch (error) {
    userStates.delete(chatId);
    activeOperations?.delete(chatId);
    console.error(error);
    await ctx.reply(
      `❌ Error switching user: ${error.message}\n\nMake sure Chrome is accessible and the CLI supports the login command.`,
    );
  }
}
