import fs from "fs";
import path from "path";

export function registerUpdatePromptCommand(bot, userStates) {
  bot.command("updateprompt", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /updateprompt triggered by ${chatId}`);
    userStates.set(chatId, {
      command: "UPDATE_PROMPT",
      step: "WAITING_FOR_DIR",
    });

    await ctx.reply(
      "📝 *Step 1/2:* Please provide the directory path where your existing `prompts.md` file is located (e.g., `C:\\Global-AI-Notifier`):",
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
) {
  if (state.step === "WAITING_FOR_DIR") {
    state.dirPath = text.trim();
    state.step = "WAITING_FOR_PROMPT";
    userStates.set(chatId, state);

    await ctx.reply(
      "✍️ *Step 2/2:* Great! Now provide the new prompt text you want to append at the bottom of `prompts.md`:",
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "WAITING_FOR_PROMPT") {
    const dirPath = state.dirPath;
    const promptText = text.trim();
    userStates.delete(chatId);

    try {
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
      const markdownEntry = `\n- **Time:** ${timestamp}\n  - **Prompt:** ${promptText}\n`;

      // ফাইলের ঠিক নিচের দিকে নতুন প্রম্পট অ্যাপেন্ড করা
      fs.appendFileSync(mdFilePath, markdownEntry, "utf8");
      console.log(
        `[UPDATE_PROMPT] Successfully appended prompt to: ${mdFilePath}`,
      );

      await ctx.reply(
        `✅ **Success!**\n\nYour new prompt has been successfully appended to the bottom of:\n\`${mdFilePath}\``,
        { parse_mode: "Markdown" },
      );
    } catch (error) {
      console.error(error);
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  }
}
