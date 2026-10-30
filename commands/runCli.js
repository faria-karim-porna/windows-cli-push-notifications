import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function registerRunCliCommand(bot, userStates, activeOperations) {
  bot.command("runcli", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /runcli triggered by ${chatId}`);

    // অ্যাবোর্ট কন্ট্রোলার তৈরি করে একটিভ অপারেশনে রেজিস্টার করা
    const controller = new AbortController();
    activeOperations.set(chatId, { controller, commandName: "runcli" });

    userStates.set(chatId, { command: "RUN_CLI", step: "WAITING_FOR_DIR" });

    await ctx.reply(
      "🚀 *Step 1/2:* Please provide the project directory path where your workspace is located (e.g., `C:\\Global-AI-Notifier`):\n*(Type /stop to cancel)*",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleRunCliFlow(
  ctx,
  chatId,
  text,
  state,
  userStates,
  bot,
  activeOperations,
) {
  const operation = activeOperations?.get(chatId);
  const signal = operation?.controller?.signal;

  if (signal && signal.aborted) {
    userStates.delete(chatId);
    activeOperations?.delete(chatId);
    return;
  }

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
    state.step = "WAITING_FOR_CLI";
    userStates.set(chatId, state);

    if (signal && signal.aborted) {
      userStates.delete(chatId);
      activeOperations?.delete(chatId);
      return;
    }

    // ইউজার ডিরেক্টরি দেওয়ার সাথে সাথে VS Code ওপেন করে দেওয়া
    try {
      console.log(`[VSCODE] Opening VS Code in: ${dirPath}`);
      exec(`code .`, { cwd: dirPath });
      await ctx.reply(`💻 VS Code has been opened in \`${dirPath}\`.`, {
        parse_mode: "Markdown",
      });
    } catch (err) {
      console.error("Failed to open VS Code:", err);
    }

    await ctx.reply(
      "⚙️ *Step 2/2:* Which CLI tool do you want to use? Please reply with either `agy` or `freebuff`:\n*(Type /stop to cancel)*",
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "WAITING_FOR_CLI") {
    const cliChoice = text.trim().toLowerCase();

    if (cliChoice !== "agy" && cliChoice !== "freebuff") {
      await ctx.reply(
        "❌ Invalid choice! Please reply with strictly `agy` or `freebuff`.",
        { parse_mode: "Markdown" },
      );
      return;
    }

    const dirPath = state.dirPath;
    userStates.delete(chatId);

    const mdFilePath = path.join(dirPath, "prompts.md");

    if (!fs.existsSync(mdFilePath)) {
      activeOperations?.delete(chatId);
      await ctx.reply(
        `❌ Error: No \`prompts.md\` file found in \`${dirPath}\`!`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    await ctx.reply(
      `🤖 *Automation Started!*\n\n**Directory:** \`${dirPath}\`\n**CLI Tool:** \`${cliChoice}\`\n\nExecuting prompts one by one... (Send /stop to cancel)`,
      { parse_mode: "Markdown" },
    );

    // ব্যাকগ্রাউন্ড অটোমেশন লুপ রান করা (signal সহ)
    runAutomationLoop(
      ctx,
      chatId,
      dirPath,
      mdFilePath,
      cliChoice,
      bot,
      activeOperations,
    );
  }
}

// প্রম্পট রিড, এক্সিকিউশন, কমিট এবং রিমুভ করার লুপ ফাংশন
async function runAutomationLoop(
  ctx,
  chatId,
  dirPath,
  mdFilePath,
  cliChoice,
  bot,
  activeOperations,
) {
  const operation = activeOperations?.get(chatId);
  const signal = operation?.controller?.signal;

  try {
    while (true) {
      // প্রতিটি লুপের শুরুতে চেক করা যে ইউজার /stop দিয়েছে কিনা
      if (signal && signal.aborted) {
        console.log(`[AUTOMATION] Stopped by user request for chat: ${chatId}`);
        activeOperations?.delete(chatId);
        await bot.api.sendMessage({
          chat_id: chatId,
          text: `🛑 *Automation has been successfully stopped by user.*`,
          parse_mode: "Markdown",
        });
        break;
      }

      const fileContent = fs.readFileSync(mdFilePath, "utf8");

      // prompts.md থেকে প্রম্পটগুলো পার্স করা (- **Prompt:** [text])
      const promptRegex = /- \*\*Prompt:\*\* (.*)/g;
      let match;
      const prompts = [];

      while ((match = promptRegex.exec(fileContent)) !== null) {
        prompts.push(match[1].trim());
      }

      if (prompts.length === 0) {
        console.log(`[AUTOMATION] prompts.md is now empty. Task completed.`);
        activeOperations?.delete(chatId);
        await bot.api.sendMessage({
          chat_id: chatId,
          text: `🎉 *All prompts from \`prompts.md\` have been successfully executed and committed!*`,
          parse_mode: "Markdown",
        });
        break;
      }

      if (signal && signal.aborted) break;

      const currentPrompt = prompts[0];
      console.log(
        `[AUTOMATION] Executing prompt: "${currentPrompt}" using ${cliChoice}`,
      );

      await bot.api.sendMessage({
        chat_id: chatId,
        text: `▶️ *Executing Prompt:* \`${currentPrompt}\``,
        parse_mode: "Markdown",
      });

      // ১. নির্দিষ্ট CLI কমান্ড রান করা
      const cliCommand = `${cliChoice} "${currentPrompt}"`;
      try {
        await execAsync(cliCommand, {
          cwd: dirPath,
          maxBuffer: 1024 * 1024 * 10,
        });
        console.log(`[CLI SUCCESS] Prompt executed.`);
      } catch (cliErr) {
        console.error(`[CLI ERROR]:`, cliErr);
        await bot.api.sendMessage({
          chat_id: chatId,
          text: `⚠️ Warning during CLI execution: \`${cliErr.message}\`. Proceeding to git commit...`,
          parse_mode: "Markdown",
        });
      }

      if (signal && signal.aborted) break;

      // ২. গিট কমিট রান করা
      console.log(`[GIT] Running git commit...`);
      try {
        const commitMsg = `feat(auto): completed prompt - ${currentPrompt.substring(0, 40)}`;
        await execAsync(`git add . && git commit -m "${commitMsg}"`, {
          cwd: dirPath,
        });
        console.log(`[GIT SUCCESS] Committed successfully.`);
      } catch (gitErr) {
        console.log(
          `[GIT INFO] Nothing to commit or git error:`,
          gitErr.message,
        );
      }

      // ৩. prompts.md থেকে এক্সিকিউটেড প্রম্পটটি রিমুভ করা
      removeFirstPromptFromFile(mdFilePath);
      console.log(`[FILE] Removed completed prompt from prompts.md`);

      // পরবর্তী প্রম্পটে যাওয়ার আগে ছোট একটি বিরতি (সাথে অ্যাবোর্ট চেক)
      for (let i = 0; i < 20; i++) {
        if (signal && signal.aborted) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  } catch (error) {
    activeOperations?.delete(chatId);
    console.error(`[AUTOMATION ERROR]:`, error);
    await bot.api.sendMessage({
      chat_id: chatId,
      text: `❌ Automation stopped due to an error: \`${error.message}\``,
      parse_mode: "Markdown",
    });
  }
}

// ফাইল থেকে প্রথম প্রম্পট ব্লকটি ডিলিট করার হেল্পার ফাংশন
function removeFirstPromptFromFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const parts = content.split(/- \*\*Time:\*\*/);
  if (parts.length > 2) {
    parts.splice(1, 1);
    fs.writeFileSync(filePath, parts.join("- **Time:**"), "utf8");
  } else {
    fs.writeFileSync(filePath, "", "utf8");
  }
}
