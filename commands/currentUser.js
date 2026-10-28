import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

export function registerCurrentUserCommand(bot, userStates) {
  bot.command("currentuser", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /currentuser triggered by ${chatId}`);
    userStates.set(chatId, { command: "CURRENT_USER" });

    await ctx.reply(
      "👤 Please provide your project directory path to check the current logged-in user (email) information:",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleCurrentUserFlow(ctx, chatId, text, userStates) {
  const dirPath = text.trim();
  userStates.delete(chatId);

  if (!fs.existsSync(dirPath)) {
    await ctx.reply(`❌ Error: The directory \`${dirPath}\` does not exist!`, {
      parse_mode: "Markdown",
    });
    return;
  }

  await ctx.reply(
    `🔍 Fetching current user / email information for \`${dirPath}\`... Please wait.`,
    { parse_mode: "Markdown" },
  );

  try {
    let userInfo = "ℹ️ No user profile info found locally.";
    let detectedCli = "Unknown";

    // ১. হোম ডিরেক্টরি বা প্রজেক্ট ফোল্ডারে সম্ভাব্য কনফিগ ফাইল চেক করা
    const homeDir = os.homedir();
    const possibleConfigPaths = [
      path.join(dirPath, ".agy-user.json"),
      path.join(dirPath, ".freebuff-user.json"),
      path.join(homeDir, ".agy", "config.json"),
      path.join(homeDir, ".freebuff", "config.json"),
    ];

    for (const cfgPath of possibleConfigPaths) {
      if (fs.existsSync(cfgPath)) {
        try {
          const content = fs.readFileSync(cfgPath, "utf8");
          const parsed = JSON.parse(content);
          if (parsed.email || parsed.user || parsed.username) {
            userInfo = parsed.email || parsed.user || parsed.username;
            break;
          }
        } catch (e) {}
      }
    }

    // ২. যদি ফাইলে না পাওয়া যায়, তবে CLI কমান্ডের আউটপুট চেক করা (যেমন: agy user / freebuff whoami)
    if (userInfo === "ℹ️ No user profile info found locally.") {
      try {
        const { stdout } = await execAsync(`agy user`, { cwd: dirPath });
        if (stdout) {
          userInfo = stdout.trim();
          detectedCli = "agy";
        }
      } catch (e) {
        try {
          const { stdout } = await execAsync(`freebuff whoami`, {
            cwd: dirPath,
          });
          if (stdout) {
            userInfo = stdout.trim();
            detectedCli = "freebuff";
          }
        } catch (err) {}
      }
    }

    await ctx.reply(
      `👤 *Current CLI User Account*\n\n- **Directory:** \`${dirPath}\`\n- **User / Email:** \`${userInfo}\``,
      { parse_mode: "Markdown" },
    );
  } catch (error) {
    console.error(error);
    await ctx.reply(`❌ Error fetching current user: ${error.message}`);
  }
}
