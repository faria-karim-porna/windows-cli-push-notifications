import {
  getAllAvailableDrives,
  searchFilesInDir,
} from "../utils/fileHelper.js";

export function registerSearchFileCommand(bot, userStates, activeOperations) {
  bot.command("searchfile", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /searchfile triggered by ${chatId}`);

    // অ্যাবোর্ট কন্ট্রোলার তৈরি করে একটিভ অপারেশনে রেজিস্টার করা
    const controller = new AbortController();
    activeOperations.set(chatId, { controller, commandName: "searchfile" });

    userStates.set(chatId, { command: "SEARCH_FILE" });

    await ctx.reply(
      "🔍 Please provide the file name or keyword to search globally across 'This PC' (e.g., `prompts` or `.env`):\n*(Type /stop to cancel)*",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleSearchFileFlow(
  ctx,
  chatId,
  text,
  userStates,
  bot,
  activeOperations,
) {
  const keyword = text.trim();
  userStates.delete(chatId);

  const operation = activeOperations?.get(chatId);
  const signal = operation?.controller?.signal;

  if (signal && signal.aborted) {
    activeOperations?.delete(chatId);
    return;
  }

  console.log(
    `[THIS_PC_FILE_SEARCH] Starting global file search for keyword: "${keyword}" across all drives...`,
  );

  // সরাসরি চ্যাট অ্যাকশন পাঠানোর ফাংশন
  const sendTyping = async () => {
    if (signal && signal.aborted) return;
    try {
      await bot.api.sendChatAction({
        chat_id: chatId,
        action: "find_location",
      });
    } catch (e) {}
  };

  try {
    await sendTyping();

    await ctx.reply(
      `🔍 Searching globally across 'This PC' for files matching "*${keyword}*"... (Send /stop to cancel)`,
      { parse_mode: "Markdown" },
    );

    await sendTyping();

    const drives = getAllAvailableDrives();
    console.log(`[DRIVES DETECTED]:`, drives);

    let matchedFiles = [];
    const maxLimit = 15;

    for (const drive of drives) {
      if (matchedFiles.length >= maxLimit || (signal && signal.aborted)) break;
      console.log(`[SCANNING DRIVE FOR FILES]: ${drive}`);

      // অ্যাসিনক্রোনাস সার্চ ফাংশনে signal পাস করা হলো
      await searchFilesInDir(
        drive,
        keyword,
        matchedFiles,
        maxLimit,
        sendTyping,
        signal,
      );
    }

    if (signal && signal.aborted) {
      activeOperations?.delete(chatId);
      await ctx.reply(
        "🛑 *File search has been successfully stopped by user.*",
        {
          parse_mode: "Markdown",
        },
      );
      return;
    }

    await sendTyping();
    activeOperations?.delete(chatId);

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
    activeOperations?.delete(chatId);
    console.error(error);
    if (signal && signal.aborted) return;
    await ctx.reply(`❌ Error: ${error.message}`);
  }
}
