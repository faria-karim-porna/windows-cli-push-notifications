import fs from "fs";
import path from "path";

export function registerUpdatePromptCommand(bot, userStates, activeOperations) {
  bot.command("updateprompt", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /updateprompt triggered by ${chatId}`);

    // অ্যাবোর্ট কন্ট্রোলার তৈরি করে একটিভ অপারেশনে রেজিস্টার করা
    const controller = new AbortController();
    activeOperations.set(chatId, { controller, commandName: "updateprompt" });

    userStates.set(chatId, {
      command: "UPDATE_PROMPT",
      step: "WAITING_FOR_DIR",
    });

    await ctx.reply(
      "📝 *Step 1/2:* Please provide the directory path where your existing `prompts.md` file is located (e.g., `C:\\Global-AI-Notifier`):\n*(Type /stop to cancel)*",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleUpdatePromptFlow(
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
      state.dirPath = text.trim();
      state.step = "WAITING_FOR_PROMPT";
      userStates.set(chatId, state);

      if (signal && signal.aborted) {
        userStates.delete(chatId);
        activeOperations?.delete(chatId);
        return;
      }

      await ctx.reply(
        "✍️ *Step 2/2:* Great! Now provide the new prompt text you want to append at the bottom of `prompts.md`:\n*(Type /stop to cancel)*",
        { parse_mode: "Markdown" },
      );
    } else if (state.step === "WAITING_FOR_PROMPT") {
      const dirPath = state.dirPath;
      const promptText = text.trim();

      userStates.delete(chatId);
      activeOperations?.delete(chatId);

      if (signal && signal.aborted) {
        return;
      }

      const mdFilePath = path.join(dirPath, "prompts.md");

      // চেক করা ফাইলটি আসলেই এক্সিস্ট করে কিনা
      if (!fs.existsSync(mdFilePath)) {
        await ctx.reply(
          `❌ Error: No \`prompts.md\` file found in \`${dirPath}\`!\n\nPlease use \`/addprompt\` first to create the file or check the path.`,
          { parse_mode: "Markdown" },
        );
        return;
      }

      const timestamp = new Date().toLocaleString();
      const markdownEntry = `\n**Time:** ${timestamp}\n  - **Prompt:** ${promptText}\n`;

      // ফাইলের ঠিক নিচের দিকে নতুন প্রম্পট অ্যাপেন্ড করা
      fs.appendFileSync(mdFilePath, markdownEntry, "utf8");
      console.log(
        `[UPDATE_PROMPT] Successfully appended prompt to: ${mdFilePath}`,
      );

      await ctx.reply(
        `✅ **Success!**\n\nYour new prompt has been successfully appended to the bottom of:\n\`${mdFilePath}\``,
        { parse_mode: "Markdown" },
      );
    }
  } catch (error) {
    userStates.delete(chatId);
    activeOperations?.delete(chatId);
    console.error(error);
    await ctx.reply(`❌ Error: ${error.message}`);
  }
}
