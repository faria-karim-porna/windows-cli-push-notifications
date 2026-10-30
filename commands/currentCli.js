import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function registerCurrentCliCommand(bot, userStates, activeOperations) {
  bot.command("currentcli", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /currentcli triggered by ${chatId}`);

    // অ্যাবোর্ট কন্ট্রোলার তৈরি করে একটিভ অপারেশনে রেজিস্টার করা
    const controller = new AbortController();
    activeOperations.set(chatId, { controller, commandName: "currentcli" });

    userStates.set(chatId, { command: "CURRENT_CLI" });

    await ctx.reply(
      "🔍 Please provide your project directory path to check which CLI (`agy` or `freebuff`) is active/installed or configured:\n*(Type /stop to cancel)*",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleCurrentCliFlow(
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
    `🔍 Checking active CLI configuration for \`${dirPath}\`... Please wait.`,
    { parse_mode: "Markdown" },
  );

  try {
    if (signal && signal.aborted) {
      activeOperations.delete(chatId);
      return;
    }

    let activeCli = "Unknown / Not Configured";

    // ১. প্রজেক্টের package.json বা কোনো লোকাল কনফিগ ফাইল চেক করা
    const packageJsonPath = path.join(dirPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageData = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const allDeps = {
        ...packageData.dependencies,
        ...packageData.devDependencies,
      };

      if (allDeps["freebuff"] || packageData.name?.includes("freebuff")) {
        activeCli = "freebuff";
      } else if (allDeps["agy"] || packageData.name?.includes("agy")) {
        activeCli = "agy";
      }
    }

    if (signal && signal.aborted) {
      activeOperations.delete(chatId);
      return;
    }

    // ২. যদি package.json এ সরাসরি না পাওয়া যায়, তবে গ্লোবাল কমান্ড চেক করা
    if (activeCli === "Unknown / Not Configured") {
      try {
        await execAsync(`freebuff --version`, { cwd: dirPath });
        activeCli = "freebuff (Available globally)";
      } catch (e) {
        try {
          await execAsync(`agy --version`, { cwd: dirPath });
          activeCli = "agy (Available globally)";
        } catch (err) {}
      }
    }

    activeOperations?.delete(chatId);

    await ctx.reply(
      `📊 *CLI Status Report*\n\n**Project Directory:** \`${dirPath}\`\n**Detected CLI:** \`${activeCli}\``,
      { parse_mode: "Markdown" },
    );
  } catch (error) {
    activeOperations?.delete(chatId);
    console.error(error);
    await ctx.reply(`❌ Error checking CLI: ${error.message}`);
  }
}
