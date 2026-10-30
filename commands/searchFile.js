import {
  getAllAvailableDrives,
  searchFilesInDir,
} from "../utils/fileHelper.js";

export function registerSearchFileCommand(bot, userStates) {
  bot.command("searchfile", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /searchfile triggered by ${chatId}`);
    userStates.set(chatId, { command: "SEARCH_FILE" });

    await ctx.reply(
      "🔍 Please provide the file name or keyword to search globally across 'This PC' (e.g., `prompts` or `.env`):",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleSearchFileFlow(ctx, chatId, text, userStates, bot) {
  const keyword = text.trim();
  userStates.delete(chatId);

  console.log(
    `[THIS_PC_FILE_SEARCH] Starting global file search for keyword: "${keyword}" across all drives...`,
  );

  // সরাসরি চ্যাট অ্যাকশন পাঠানোর ফাংশন (setInterval ছাড়া)
  const sendTyping = async () => {
    try {
      await bot.api.sendChatAction({
        chat_id: chatId,
        action: "find_location",
      });
    } catch (e) {}
  };

  try {
    // প্রথমে অ্যাকশন শুরু করা
    await sendTyping();

    await ctx.reply(
      `🔍 Searching globally across 'This PC' for files matching "*${keyword}*"... Please wait.`,
      { parse_mode: "Markdown" },
    );

    await sendTyping();

    const drives = getAllAvailableDrives();
    console.log(`[DRIVES DETECTED]:`, drives);

    let matchedFiles = [];
    const maxLimit = 15;

    for (const drive of drives) {
      if (matchedFiles.length >= maxLimit) break;
      console.log(`[SCANNING DRIVE FOR FILES]: ${drive}`);

      // অ্যাসিনক্রোনাস সার্চ ফাংশনের মাধ্যমে প্রোগ্রেস ও টাইপিং সচল রাখা
      await searchFilesInDir(
        drive,
        keyword,
        matchedFiles,
        maxLimit,
        sendTyping,
      );
    }

    await sendTyping();

    console.log(
      `[THIS_PC_FILE_SEARCH] Search completed. Total matched files: ${matchedFiles.length}`,
    );

    if (matchedFiles.length === 0) {
      await ctx.reply(
        `⚠️ No matching files found globally on 'This PC' for "*${keyword}*".`,
        { parse_mode: "Markdown" },
      );
    } else {
      let responseText = `📄 *This PC File Search Results (${matchedFiles.length}):*\n\n`;
      matchedFiles.forEach((file, index) => {
        responseText += `${index + 1}. \`${file}\`\n`;
      });
      await ctx.reply(responseText, { parse_mode: "Markdown" });
    }
  } catch (error) {
    console.error(error);
    await ctx.reply(`❌ Error: ${error.message}`);
  }
}
