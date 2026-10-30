import {
  getAllAvailableDrives,
  searchFoldersInDir,
} from "../utils/fileHelper.js";

export function registerSearchFolderCommand(bot, userStates, activeOperations) {
  bot.command("searchfolder", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /searchfolder triggered by ${chatId}`);

    // অ্যাবোর্ট কন্ট্রোলার তৈরি করে একটিভ অপারেশনে রেজিস্টার করা
    const controller = new AbortController();
    activeOperations.set(chatId, { controller, commandName: "searchfolder" });

    userStates.set(chatId, { command: "SEARCH_FOLDER" });

    await ctx.reply(
      "🔍 Please provide the folder keyword to search globally across 'This PC':\n*(Type /stop to cancel)*",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleSearchFolderFlow(
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
    `[THIS_PC_SEARCH] Starting global search for keyword: "${keyword}" across all drives...`,
  );

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
      `🔍 Searching globally across 'This PC' for folders matching "*${keyword}*"... (Send /stop to cancel)`,
      { parse_mode: "Markdown" },
    );

    await sendTyping();

    const drives = getAllAvailableDrives();
    console.log(`[DRIVES DETECTED]:`, drives);

    let matchedFolders = [];
    const maxLimit = 15;

    for (const drive of drives) {
      if (matchedFolders.length >= maxLimit || (signal && signal.aborted))
        break;
      console.log(`[SCANNING DRIVE]: ${drive}`);

      // অ্যাসিনক্রোনাস ফোল্ডার সার্চ ফাংশনে signal পাস করা হলো
      await searchFoldersInDir(
        drive,
        keyword,
        matchedFolders,
        maxLimit,
        sendTyping,
        signal,
      );
    }

    if (signal && signal.aborted) {
      activeOperations?.delete(chatId);
      await ctx.reply(
        "🛑 *Folder search has been successfully stopped by user.*",
        {
          parse_mode: "Markdown",
        },
      );
      return;
    }

    await sendTyping();
    activeOperations?.delete(chatId);

    console.log(
      `[THIS_PC_SEARCH] Search completed. Total matched: ${matchedFolders.length}`,
    );

    if (matchedFolders.length === 0) {
      await ctx.reply(
        `⚠️ No matching folders found globally on 'This PC' for "*${keyword}*".`,
        { parse_mode: "Markdown" },
      );
    } else {
      let responseText = `📂 *This PC Search Results (${matchedFolders.length}):*\n\n`;
      matchedFolders.forEach((folder, index) => {
        responseText += `${index + 1}. \`${folder}\`\n`;
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
