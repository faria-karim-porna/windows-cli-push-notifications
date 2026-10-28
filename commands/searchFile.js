import { getAllAvailableDrives, searchFilesInDir } from "../utils/fileHelper.js";

export function registerSearchFileCommand(bot, userStates) {
  bot.command("searchfile", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /searchfile triggered by ${chatId}`);
    userStates.set(chatId, { command: "SEARCH_FILE" });

    await ctx.reply(
      "🔍 Please provide the file name or keyword to search globally across 'This PC' (e.g., `prompts` or `.env`):",
      { parse_mode: "Markdown" }
    );
  });
}

export async function handleSearchFileFlow(ctx, chatId, text, userStates, bot) {
  const keyword = text.trim();
  userStates.delete(chatId);

  console.log(`[THIS_PC_FILE_SEARCH] Starting global file search for keyword: "${keyword}" across all drives...`);

  const sendTyping = async () => {
    try {
      await bot.api.sendChatAction({ chat_id: chatId, action: "typing" });
    } catch (e) {}
  };

  await sendTyping();
  const typingInterval = setInterval(sendTyping, 3000);

  try {
    await ctx.reply(
      `🔍 Searching globally across 'This PC' for files matching "*${keyword}*"... Please wait.`,
      { parse_mode: "Markdown" }
    );

    const drives = getAllAvailableDrives();
    console.log(`[DRIVES DETECTED]:`, drives);

    let matchedFiles = [];
    const maxLimit = 15;

    for (const drive of drives) {
      if (matchedFiles.length >= maxLimit) break;
      console.log(`[SCANNING DRIVE FOR FILES]: ${drive}`);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      searchFilesInDir(drive, keyword, matchedFiles, maxLimit);
    }

    clearInterval(typingInterval);

    console.log(`[THIS_PC_FILE_SEARCH] Search completed. Total matched files: ${matchedFiles.length}`);

    if (matchedFiles.length === 0) {
      await ctx.reply(
        `⚠️ No matching files found globally on 'This PC' for "*${keyword}*".`,
        { parse_mode: "Markdown" }
      );
    } else {
      let responseText = `📄 *This PC File Search Results (${matchedFiles.length}):*\n\n`;
      matchedFiles.forEach((file, index) => {
        responseText += `${index + 1}. \`${file}\`\n`;
      });
      await ctx.reply(responseText, { parse_mode: "Markdown" });
    }
  } catch (error) {
    clearInterval(typingInterval);
    console.error(error);
    await ctx.reply(`❌ Error: ${error.message}`);
  }
}