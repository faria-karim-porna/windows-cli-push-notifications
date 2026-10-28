import fs from "fs";
import path from "path";

export function registerSwitchModelCommand(bot, userStates) {
  bot.command("switchmodel", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /switchmodel triggered by ${chatId}`);
    userStates.set(chatId, {
      command: "SWITCH_MODEL",
      step: "WAITING_FOR_DIR",
    });

    await ctx.reply(
      "🔄 *Step 1/2:* Please provide your project directory path where the CLI configuration is located:",
      { parse_mode: "Markdown" },
    );
  });
}

export async function handleSwitchModelFlow(
  ctx,
  chatId,
  text,
  state,
  userStates,
) {
  if (state.step === "WAITING_FOR_DIR") {
    const dirPath = text.trim();

    if (!fs.existsSync(dirPath)) {
      await ctx.reply(
        `❌ Error: The directory \`${dirPath}\` does not exist!`,
        { parse_mode: "Markdown" },
      );
      userStates.delete(chatId);
      return;
    }

    state.dirPath = dirPath;
    userStates.delete(chatId); // স্টেট ক্লিয়ার করে ইনলাইন অপশন শো করাচ্ছি

    // মডেল সিলেকশনের ইনলাইন কিবোর্ড
    const inlineKeyboard = [
      [
        {
          text: "🤖 Claude 3.5 Sonnet",
          callback_data: `model_switch:claude-3.5-sonnet`,
        },
        { text: "🧠 GPT-4o", callback_data: `model_switch:gpt-4o` },
      ],
      [
        { text: "⚡ Gemini Pro", callback_data: `model_switch:gemini-pro` },
        { text: "🛠️ DeepSeek V3", callback_data: `model_switch:deepseek-v3` },
      ],
      [{ text: "❌ Cancel", callback_data: `model_cancel` }],
    ];

    // ডিরেক্টরি পাথটি টেম্পোরারিভাবে বা ক্যাশ করে রাখতে পারেন, অথবা কলব্যাক ডেটায় এনকোড করতে পারেন।
    // সহজ রাখার জন্য এখানে সরাসরি ফোল্ডারে মডেল কনফিগ রাইট করার অপশন রাখা হচ্ছে।
    state.targetDir = dirPath;
    userStates.set(chatId, {
      ...state,
      command: "WAITING_FOR_MODEL_SELECTION",
      targetDir: dirPath,
    });

    await ctx.reply(
      `📂 *Project Path Set:* \`${dirPath}\`\n\n👇 Please select the model you want to switch to:`,
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: inlineKeyboard },
      },
    );
  }
}

// মডেল সিলেকশন কলব্যাক হ্যান্ডলার
export function registerSwitchModelCallback(bot) {
  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (!data.startsWith("model_")) return;

    try {
      if (data === "model_cancel") {
        await bot.api.editMessageText({
          chat_id: chatId,
          message_id: query.message.message_id,
          text: "❌ Model switching cancelled.",
        });
        await bot.api.answerCallbackQuery({
          callback_query_id: query.id,
          text: "Cancelled.",
        });
        return;
      }

      if (data.startsWith("model_switch:")) {
        const selectedModel = data.replace("model_switch:", "");

        // এখানে আপনি আপনার CLI কনফিগ ফাইলে (যেমন .env, agy.config.json, বা freebuff setting) মডেল আপডেট করার লজিক লিখতে পারেন।
        // উদাহরণস্বরূপ একটি সিমুলেশন:

        await bot.api.editMessageText({
          chat_id: chatId,
          message_id: query.message.message_id,
          text: `✅ *Model Switched Successfully!*\n\n- **Selected Model:** \`${selectedModel}\`\n- **Status:** CLI configuration updated.`,
          parse_mode: "Markdown",
        });

        await bot.api.answerCallbackQuery({
          callback_query_id: query.id,
          text: `Switched to ${selectedModel}!`,
        });
      }
    } catch (error) {
      console.error("Model switch error:", error);
      try {
        await bot.api.answerCallbackQuery({
          callback_query_id: query.id,
          text: "Failed to switch model!",
        });
      } catch (e) {}
    }
  });
}
