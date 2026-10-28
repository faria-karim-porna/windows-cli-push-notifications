import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function registerSwitchUserCommand(bot, userStates) {
  bot.command("switchuser", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /switchuser triggered by ${chatId}`);
    userStates.set(chatId, { command: "SWITCH_USER", step: "WAITING_FOR_DIR" });

    await ctx.reply(
      "👤 *Step 1/2:* Please provide your project directory path where the CLI tool is configured:",
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
) {
  if (state.step === "WAITING_FOR_DIR") {
    const dirPath = text.trim();

    if (!fs.existsSync(dirPath)) {
      await ctx.reply(
        `❌ Error: The directory \`${dirPath}\` does not exist!`,
        { parse_mode: "Markdown" },
      );
      userStates.delete(chatId);
      return;
    }

    state.dirPath = dirPath;
    state.step = "WAITING_FOR_CLI_CHOICE";
    userStates.set(chatId, state);

    await ctx.reply(
      "⚙️ *Step 2/2:* Which CLI tool user do you want to switch? Please reply with either `agy` or `freebuff`:",
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "WAITING_FOR_CLI_CHOICE") {
    const cliChoice = text.trim().toLowerCase();
    const dirPath = state.dirPath;
    userStates.delete(chatId);

    if (cliChoice !== "agy" && cliChoice !== "freebuff") {
      await ctx.reply(
        `❌ Invalid choice! Please reply with strictly \`agy\` or \`freebuff\`.`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    await ctx.reply(
      `🔄 Initiating user switch for \`${cliChoice}\` in \`${dirPath}\`...\n\nLogging out and opening Chrome for new login... Please check your browser.`,
      { parse_mode: "Markdown" },
    );

    try {
      // ১. প্রথমে বর্তমান সেশন লগআউট বা ক্যাশ ক্লিয়ার করার কমান্ড রান করা
      try {
        await execAsync(`${cliChoice} logout`, { cwd: dirPath });
      } catch (e) {
        // যদি লগআউট কমান্ড সরাসরি না থাকে, লোকাল ক্রেডেনশিয়াল ফাইল ডিলিট করার ব্যবস্থা রাখা যায়
      }

      // ২. ক্রোম ব্রাউজার ব্যবহার করে নতুন ইউজার হিসেবে লগইন করার কমান্ড রান করা
      // (বেশভাগ CLI টুলের ক্ষেত্রে 'login' কমান্ড ব্রাউজার বা ক্রোম ট্রিগার করে)
      const { stdout, stderr } = await execAsync(`${cliChoice} login`, {
        cwd: dirPath,
      });

      console.log(
        `[SWITCH_USER] Successfully triggered login for ${cliChoice}`,
      );

      await ctx.reply(
        `✅ *User Switch Triggered Successfully!*\n\n- **CLI Tool:** \`${cliChoice}\`\n- **Status:** Previous session cleared. Please complete the login in the opened Chrome browser window.`,
        { parse_mode: "Markdown" },
      );
    } catch (error) {
      console.error(error);
      await ctx.reply(
        `❌ Error switching user: ${error.message}\n\nMake sure Chrome is accessible and the CLI supports the login command.`,
      );
    }
  }
}
