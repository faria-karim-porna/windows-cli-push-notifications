import fs from "fs";
import path from "path";

// ড্রাইভ বা ফোল্ডারের লিস্ট ইনলাইন কিবোর্ড আকারে তৈরি করার ফাংশন
function getDirectoryKeyboard(currentPath) {
  const inlineKeyboard = [];

  try {
    const items = fs.readdirSync(currentPath, { withFileTypes: true });

    // ফোল্ডারগুলো আগে ফিল্টার করে সাজানো
    const folders = items.filter((item) => item.isDirectory());

    for (const folder of folders) {
      const folderName = folder.name;
      const fullPath = path.join(currentPath, folderName);

      // বাটনের টেক্সট এবং কলব্যাক ডেটায় পাথ পাস করা (টেলিগ্রামের ৬৪ বাইট লিমিট এড়াতে শর্ট বা এনকোডেড রাখতে হয়, তবে লোকাল পাথের জন্য সরাসরি পাস করা যায়)
      inlineKeyboard.push([
        { text: `📁 ${folderName}`, callback_data: `nav_dir:${fullPath}` },
      ]);
    }
  } catch (err) {
    // এক্সেস পার্মিশন না থাকলে ইগনোর করবে
  }

  // কন্ট্রোল বাটনগুলো নিচে যুক্ত করা
  const parentDir = path.dirname(currentPath);
  const controlButtons = [];

  if (parentDir && parentDir !== currentPath) {
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

  return { inline_keyboard: inlineKeyboard };
}

export function registerNavigatePathCommand(bot, userStates) {
  bot.command("navigatetopath", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /navigatetopath triggered by ${chatId}`);

    // ডিফল্টভাবে ড্রাইভ লিস্ট দেখানোর জন্য দিস পিসির ড্রাইভগুলো বের করা
    const drives = [];
    const possibleLetters = ["C", "D", "E", "F", "G", "H"];
    for (const letter of possibleLetters) {
      const drivePath = `${letter}:\\`;
      if (fs.existsSync(drivePath)) {
        drives.push(drivePath);
      }
    }

    const inlineKeyboard = drives.map((drive) => [
      { text: `💾 Drive ${drive}`, callback_data: `nav_dir:${drive}` },
    ]);
    inlineKeyboard.push([{ text: "❌ Exit", callback_data: `nav_exit` }]);

    await ctx.reply("🗂️ *Please select a drive to start navigation:*", {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: inlineKeyboard },
    });
  });
}

// ইনলাইন বাটন ক্লিক হ্যান্ডেল করার জন্য কলব্যাক কুয়েরি লিসেনার
export function registerNavigateCallback(bot) {
  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (!data.startsWith("nav_")) return;

    try {
      if (data === "nav_exit") {
        await bot.api.editMessageText({
          chat_id: chatId,
          message_id: query.message.message_id,
          text: "❌ Path navigation exited.",
        });
        await bot.api.answerCallbackQuery({
          callback_query_id: query.id,
          text: "Exited.",
        });
        return;
      }

      if (data.startsWith("nav_select:")) {
        const selectedPath = data.replace("nav_select:", "");
        await bot.api.editMessageText({
          chat_id: chatId,
          message_id: query.message.message_id,
          text: `✅ *Selected Path Successfully!*\n\n\`${selectedPath}\``,
          parse_mode: "Markdown",
        });
        await bot.api.answerCallbackQuery({
          callback_query_id: query.id,
          text: "Path selected!",
        });
        return;
      }

      if (data.startsWith("nav_dir:")) {
        const targetPath = data.replace("nav_dir:", "");

        if (!fs.existsSync(targetPath)) {
          await bot.api.answerCallbackQuery({
            callback_query_id: query.id,
            text: "Directory does not exist!",
          });
          return;
        }

        const keyboard = getDirectoryKeyboard(targetPath);

        await bot.api.editMessageText({
          chat_id: chatId,
          message_id: query.message.message_id,
          text: `📂 *Current Path:*\n\`${targetPath}\`\n\nSelect a folder below:`,
          parse_mode: "Markdown",
          reply_markup: keyboard,
        });

        await bot.api.answerCallbackQuery({ callback_query_id: query.id });
      }
    } catch (error) {
      console.error("Navigation error:", error);
      try {
        await bot.api.answerCallbackQuery({
          callback_query_id: query.id,
          text: "Error navigating directory!",
        });
      } catch (e) {}
    }
  });
}
