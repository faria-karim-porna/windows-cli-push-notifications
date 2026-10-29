import {
  getAllAvailableDrives,
  searchFoldersInDir,
} from "../utils/fileHelper.js";

export function registerSearchFolderCommand(bot, userStates) {
  bot.command("searchfolder", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /searchfolder triggered by ${chatId}`);
    userStates.set(chatId, { command: "SEARCH_FOLDER" });

    await ctx.reply(
      "🔍 Please provide the folder keyword to search globally across 'This PC':",
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
) {
  const keyword = text.trim();
  userStates.delete(chatId);

  console.log(
    `[THIS_PC_SEARCH] Starting global search for keyword: "${keyword}" across all drives...`,
  );

  const sendTyping = async () => {
    try {
      await bot.api.sendChatAction({ chat_id: chatId, action: "typing" });
    } catch (e) {}
  };

  await sendTyping();
  const typingInterval = setInterval(sendTyping, 2000);

  try {
    await ctx.reply(
      `🔍 Searching globally across 'This PC' for folders matching "*${keyword}*"... Please wait.`,
      { parse_mode: "Markdown" },
    );

    await sendTyping();

    const drives = getAllAvailableDrives();
    console.log(`[DRIVES DETECTED]:`, drives);

    let matchedFolders = [];
    const maxLimit = 15;

    for (const drive of drives) {
      if (matchedFolders.length >= maxLimit) break;
      console.log(`[SCANNING DRIVE]: ${drive}`);

      // 🔥 অ্যাসিনক্রোনাস সার্চ ফাংশন ব্যবহারের কারণে এখানে await ব্যবহার করা হলো
      await searchFoldersInDir(
        drive,
        keyword,
        matchedFolders,
        maxLimit,
        sendTyping,
      );
    }

    clearInterval(typingInterval);
    await sendTyping();

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
    clearInterval(typingInterval);
    console.error(error);
    await ctx.reply(`❌ Error: ${error.message}`);
  } finally {
    clearInterval(typingInterval);
  }
}
