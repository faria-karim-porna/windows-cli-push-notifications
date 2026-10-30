import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function registerCurrentUsageCommand(bot, userStates, activeOperations) {
  bot.command("currentusage", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /currentusage triggered by ${chatId}`);

    // অ্যাবোর্ট কন্ট্রোলার তৈরি করে একটিভ অপারেশনে রেজিস্টার করা
    const controller = new AbortController();
    activeOperations.set(chatId, { controller, commandName: "currentusage" });

    userStates.set(chatId, { command: "CURRENT_USAGE" });

    await ctx.reply(
      "📊 Please provide your project directory path to check the current CLI usage and token status:\n*(Type /stop to cancel)*",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleCurrentUsageFlow(
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
    `🔍 Fetching current CLI usage statistics for \`${dirPath}\`... Please wait.`,
    { parse_mode: "Markdown" },
  );

  try {
    if (signal && signal.aborted) {
      activeOperations.delete(chatId);
      return;
    }

    let usageReport = "ℹ️ No detailed usage logs found.";

    // ১. লোকাল কোনো লগ বা ক্যাশ ফাইল চেক করা
    const possibleLogFiles = [
      path.join(dirPath, ".agy-usage.json"),
      path.join(dirPath, ".freebuff-stats.json"),
      path.join(dirPath, "usage.json"),
    ];

    for (const logFile of possibleLogFiles) {
      if (fs.existsSync(logFile)) {
        const logData = fs.readFileSync(logFile, "utf8");
        usageReport = `\`\`\`json\n${logData}\n\`\`\``;
        break;
      }
    }

    if (signal && signal.aborted) {
      activeOperations.delete(chatId);
      return;
    }

    // ২. যদি লোকাল ফাইল না থাকে, তবে CLI কমান্ডের মাধ্যমে স্ট্যাটাস চেক করার চেষ্টা করা
    if (usageReport === "ℹ️ No detailed usage logs found.") {
      try {
        const { stdout } = await execAsync(`agy usage --json`, {
          cwd: dirPath,
        });
        if (stdout) usageReport = `\`\`\`json\n${stdout}\n\`\`\``;
      } catch (e) {
        try {
          const { stdout } = await execAsync(`freebuff status`, {
            cwd: dirPath,
          });
          if (stdout) usageReport = `\`\`\`text\n${stdout}\n\`\`\``;
        } catch (err) {}
      }
    }

    activeOperations?.delete(chatId);

    await ctx.reply(
      `📈 *CLI Usage & Token Report*\n\n**Directory:** \`${dirPath}\`\n\n${usageReport}`,
      { parse_mode: "Markdown" },
    );
  } catch (error) {
    activeOperations?.delete(chatId);
    console.error(error);
    await ctx.reply(`❌ Error fetching usage: ${error.message}`);
  }
}
