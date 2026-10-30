import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

export function registerCurrentUserCommand(bot, userStates, activeOperations) {
  bot.command("currentuser", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /currentuser triggered by ${chatId}`);

    // অ্যাবোর্ট কন্ট্রোলার তৈরি করে একটিভ অপারেশনে রেজিস্টার করা
    const controller = new AbortController();
    activeOperations.set(chatId, { controller, commandName: "currentuser" });

    userStates.set(chatId, { command: "CURRENT_USER" });

    await ctx.reply(
      "👤 Please provide your project directory path to check the current logged-in user (email) information:\n*(Type /stop to cancel)*",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleCurrentUserFlow(
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
    `🔍 Fetching current user / email information for \`${dirPath}\`... Please wait.`,
    { parse_mode: "Markdown" },
  );

  try {
    if (signal && signal.aborted) {
      activeOperations.delete(chatId);
      return;
    }

    let userInfo = "ℹ️ No user profile info found locally.";

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

    if (signal && signal.aborted) {
      activeOperations.delete(chatId);
      return;
    }

    // ২. যদি ফাইলে না পাওয়া যায়, তবে CLI কমান্ডের আউটপুট চেক করা
    if (userInfo === "ℹ️ No user profile info found locally.") {
      try {
        const { stdout } = await execAsync(`agy user`, { cwd: dirPath });
        if (stdout) {
          userInfo = stdout.trim();
        }
      } catch (e) {
        try {
          const { stdout } = await execAsync(`freebuff whoami`, {
            cwd: dirPath,
          });
          if (stdout) {
            userInfo = stdout.trim();
          }
        } catch (err) {}
      }
    }

    activeOperations?.delete(chatId);

    await ctx.reply(
      `👤 *Current CLI User Account*\n\n**Directory:** \`${dirPath}\`\n**User / Email:** \`${userInfo}\``,
      { parse_mode: "Markdown" },
    );
  } catch (error) {
    activeOperations?.delete(chatId);
    console.error(error);
    await ctx.reply(`❌ Error fetching current user: ${error.message}`);
  }
}
