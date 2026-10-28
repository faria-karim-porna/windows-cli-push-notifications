import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function registerCurrentCliCommand(bot, userStates) {
  bot.command("currentcli", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /currentcli triggered by ${chatId}`);
    userStates.set(chatId, { command: "CURRENT_CLI" });

    await ctx.reply(
      "🔍 Please provide your project directory path to check which CLI (`agy` or `freebuff`) is active/installed or configured:",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleCurrentCliFlow(ctx, chatId, text, userStates) {
  const dirPath = text.trim();
  userStates.delete(chatId);

  if (!fs.existsSync(dirPath)) {
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
    let activeCli = "Unknown / Not Configured";
    let details = "";

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

    // ২. যদি package.json এ সরাসরি না পাওয়া যায়, তবে গ্লোবাল কমান্ড চ্যারেক্টার চেক করা (agy --version / freebuff --version)
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

    await ctx.reply(
      `📊 *CLI Status Report*\n\n- **Project Directory:** \`${dirPath}\`\n- **Detected CLI:** \`${activeCli}\``,
      { parse_mode: "Markdown" },
    );
  } catch (error) {
    console.error(error);
    await ctx.reply(`❌ Error checking CLI: ${error.message}`);
  }
}
