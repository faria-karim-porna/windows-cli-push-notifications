import fs from "fs";
import path from "path";

// ড্রাইভ বা ফোল্ডারের লিস্ট ইনলাইন কিবোর্ড আকারে তৈরি করার ফাংশন
function getDirectoryKeyboard(currentPath) {
  console.log(`[NAV_KEYBOARD] Generating keyboard for path: ${currentPath}`);
  const inlineKeyboard = [];

  try {
    const items = fs.readdirSync(currentPath, { withFileTypes: true });
    console.log(
      `[NAV_KEYBOARD] Read directory items successfully. Total items: ${items.length}`,
    );

    // ফোল্ডারগুলো আগে ফিল্টার করে সাজানো
    const folders = items.filter((item) => item.isDirectory());
    console.log(`[NAV_KEYBOARD] Filtered sub-folders count: ${folders.length}`);

    for (const folder of folders) {
      const folderName = folder.name;
      const fullPath = path.join(currentPath, folderName);
      console.log(
        `[NAV_KEYBOARD] Loop item -> Folder: "${folderName}" | Path: "${fullPath}"`,
      );

      inlineKeyboard.push([
        { text: `📁 ${folderName}`, callback_data: `nav_dir:${fullPath}` },
      ]);
    }
  } catch (err) {
    console.error(
      `[NAV_KEYBOARD] Error reading directory ${currentPath}:`,
      err.message,
    );
  }

  // কন্ট্রোল বাটনগুলো নিচে যুক্ত করা
  const parentDir = path.dirname(currentPath);
  const controlButtons = [];
  console.log(`[NAV_KEYBOARD] Resolved parent directory: ${parentDir}`);

  if (parentDir && parentDir !== currentPath) {
    console.log(`[NAV_KEYBOARD] Adding 'Back' button for parent: ${parentDir}`);
    controlButtons.push({
      text: "⬅️ Back",
      callback_data: `nav_dir:${parentDir}`,
    });
  }

  controlButtons.push({
    text: "✅ Select This Path",
    callback_data: `nav_select:${currentPath}`,
  });
  controlButtons.push({ text: "❌ Exit", callback_data: `nav_exit` });

  inlineKeyboard.push(controlButtons);
  console.log(
    `[NAV_KEYBOARD] Keyboard generated with ${inlineKeyboard.length} rows.`,
  );

  return { inline_keyboard: inlineKeyboard };
}

export function registerNavigatePathCommand(bot, userStates) {
  bot.command("navigatetopath", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /navigatetopath triggered by chat ID: ${chatId}`);

    const drives = [];
    const possibleLetters = ["C", "D", "E", "F", "G", "H"];
    console.log(`[NAV_DRIVES] Checking available system drives...`);

    for (const letter of possibleLetters) {
      const drivePath = `${letter}:\\`;
      const exists = fs.existsSync(drivePath);
      console.log(
        `[NAV_DRIVES] Loop drive check -> Drive ${drivePath}: Exists = ${exists}`,
      );
      if (exists) {
        drives.push(drivePath);
      }
    }

    console.log(
      `[NAV_DRIVES] Total available drives found: ${drives.length}`,
      drives,
    );

    const inlineKeyboard = drives.map((drive) => [
      { text: `💾 Drive ${drive}`, callback_data: `nav_dir:${drive}` },
    ]);
    inlineKeyboard.push([{ text: "❌ Exit", callback_data: `nav_exit` }]);

    await ctx.reply("🗂️ *Please select a drive to start navigation:*", {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: inlineKeyboard },
    });
    console.log(`[NAV_DRIVES] Drive selection menu sent to chat ID: ${chatId}`);
  });
}

// ইনলাইন বাটন ক্লিক হ্যান্ডেল করার জন্য কলব্যাক কুয়েরি লিসেনার
export function registerNavigateCallback(bot) {
  bot.on("callback_query", async (query) => {
    console.log("[RAW_CALLBACK_QUERY_EVENT]", JSON.stringify(query, null, 2));

    // সঠিক পাথ থেকে callback_query অবজেক্ট এবং ডেটা এক্সট্র্যাক্ট করা
    const callbackQuery = query.update?.callback_query || query;
    const chatId = callbackQuery.message?.chat?.id || callbackQuery.from?.id;
    const data = callbackQuery.data;

    if (!data || typeof data !== "string") {
      console.log(
        `[CALLBACK] Ignored empty or non-string callback data. Received data type: ${typeof data}`,
      );
      return;
    }

    console.log(
      `[CALLBACK] Received callback query -> Chat ID: ${chatId} | Data: ${data}`,
    );

    if (!data.startsWith("nav_")) {
      console.log(`[CALLBACK] Ignored non-navigation callback data: ${data}`);
      return;
    }

    try {
      if (data === "nav_exit") {
        console.log(`[NAV_EXIT] User exited navigation.`);
        if (callbackQuery.message) {
          await bot.api.editMessageText({
            chat_id: chatId,
            message_id: callbackQuery.message.message_id,
            text: "❌ Path navigation exited.",
          });
        }
        await bot.api.answerCallbackQuery({
          callback_query_id: callbackQuery.id,
          text: "Exited.",
        });
        return;
      }

      if (data.startsWith("nav_select:")) {
        const selectedPath = data.replace("nav_select:", "");
        console.log(`[NAV_SELECT] Path selected by user: ${selectedPath}`);
        if (callbackQuery.message) {
          await bot.api.editMessageText({
            chat_id: chatId,
            message_id: callbackQuery.message.message_id,
            text: `✅ *Selected Path Successfully!*\n\n\`${selectedPath}\``,
            parse_mode: "Markdown",
          });
        }
        await bot.api.answerCallbackQuery({
          callback_query_id: callbackQuery.id,
          text: "Path selected!",
        });
        return;
      }

      if (data.startsWith("nav_dir:")) {
        const targetPath = data.replace("nav_dir:", "");
        console.log(`[NAV_DIR] Target path requested: ${targetPath}`);

        if (!fs.existsSync(targetPath)) {
          console.warn(
            `[NAV_DIR] Warning: Target path does not exist or inaccessible: ${targetPath}`,
          );
          await bot.api.answerCallbackQuery({
            callback_query_id: callbackQuery.id,
            text: "Directory does not exist or inaccessible!",
          });
          return;
        }

        const keyboard = getDirectoryKeyboard(targetPath);

        if (callbackQuery.message) {
          await bot.api.editMessageText({
            chat_id: chatId,
            message_id: callbackQuery.message.message_id,
            text: `📂 *Current Path:*\n\`${targetPath}\`\n\nSelect a folder below:`,
            parse_mode: "Markdown",
            reply_markup: keyboard,
          });
          console.log(
            `[NAV_DIR] Message updated successfully with sub-directories for: ${targetPath}`,
          );
        }

        await bot.api.answerCallbackQuery({
          callback_query_id: callbackQuery.id,
        });
      }
    } catch (error) {
      console.error("[NAV_ERROR] Navigation callback error occurred:", error);
      try {
        await bot.api.answerCallbackQuery({
          callback_query_id: callbackQuery.id,
          text: "Error navigating directory!",
        });
      } catch (e) {}
    }
  });
}
