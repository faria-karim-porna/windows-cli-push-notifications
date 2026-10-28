import fs from "fs";
import path from "path";

export function registerAddPromptCommand(bot, userStates) {
  bot.command("addprompt", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /addprompt triggered by ${chatId}`);
    userStates.set(chatId, { command: "ADD_PROMPT", step: "WAITING_FOR_DIR" });

    await ctx.reply(
      "📂 *Step 1/2:* Please provide the target directory path (e.g., `C:\\Global-AI-Notifier`):",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleAddPromptFlow(
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
      "✍️ *Step 2/2:* Great! Now please provide your prompt text:",
      { parse_mode: "Markdown" },
    );
  } else if (state.step === "WAITING_FOR_PROMPT") {
    const dirPath = state.dirPath;
    const promptText = text.trim();
    userStates.delete(chatId);

    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const mdFilePath = path.join(dirPath, "prompts.md");
      const fileExists = fs.existsSync(mdFilePath);
      const timestamp = new Date().toLocaleString();
      const markdownEntry = `- **Time:** ${timestamp}\n  - **Prompt:** ${promptText}\n\n`;

      fs.appendFileSync(mdFilePath, markdownEntry, "utf8");

      if (fileExists) {
        await ctx.reply(
          `ℹ️ **Note:** The \`prompts.md\` file already existed!\n\nThe new prompt has been appended:\n\`${mdFilePath}\``,
          { parse_mode: "Markdown" },
        );
      } else {
        await ctx.reply(
          `✅ **Success!**\n\nA new \`prompts.md\` file has been created:\n\`${mdFilePath}\``,
          { parse_mode: "Markdown" },
        );
      }
    } catch (error) {
      console.error(error);
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  }
}
