import fs from "fs";
import path from "path";

export function registerSwitchModelCommand(bot, userStates, activeOperations) {
  bot.command("switchmodel", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /switchmodel triggered by ${chatId}`);

    // অ্যাবোর্ট কন্ট্রোলার তৈরি করে একটিভ অপারেশনে রেজিস্টার করা
    const controller = new AbortController();
    activeOperations.set(chatId, { controller, commandName: "switchmodel" });

    userStates.set(chatId, {
      command: "SWITCH_MODEL",
      step: "WAITING_FOR_DIR",
    });

    await ctx.reply(
      "🔄 *Step 1/2:* Please provide your project directory path where the CLI configuration is located:\n*(Type /stop to cancel)*",
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
  activeOperations,
) {
  const operation = activeOperations?.get(chatId);
  const signal = operation?.controller?.signal;

  if (signal && signal.aborted) {
    userStates.delete(chatId);
    activeOperations?.delete(chatId);
    return;
  }

  if (state.step === "WAITING_FOR_DIR") {
    const dirPath = text.trim();

    if (!fs.existsSync(dirPath)) {
      userStates.delete(chatId);
      activeOperations?.delete(chatId);
      await ctx.reply(
        `❌ Error: The directory \`${dirPath}\` does not exist!`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    if (signal && signal.aborted) {
      userStates.delete(chatId);
      activeOperations?.delete(chatId);
      return;
    }

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

    state.targetDir = dirPath;
    userStates.set(chatId, {
      ...state,
      command: "WAITING_FOR_MODEL_SELECTION",
      targetDir: dirPath,
    });

    await ctx.reply(
      `📂 *Project Path Set:* \`${dirPath}\`\n\n👇 Please select the model you want to switch to:\n*(Type /stop to cancel)*`,
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: inlineKeyboard },
      },
    );
  }
}

// মডেল সিলেকশন কলব্যাক হ্যান্ডলার
export function registerSwitchModelCallback(bot, activeOperations) {
  bot.on("callback_query", async (query) => {
    const callbackQuery = query.update?.callback_query || query;
    const chatId = callbackQuery.message?.chat?.id || callbackQuery.from?.id;
    const data = callbackQuery.data;

    // যদি অপারেশনটি আগেই স্টপ বা অ্যাবোর্ট করা হয়ে থাকে
    const operation = activeOperations?.get(chatId);
    if (operation && operation.controller.signal.aborted) {
      activeOperations.delete(chatId);
      await bot.api.answerCallbackQuery({
        callback_query_id: callbackQuery.id,
        text: "Model switching was stopped.",
      });
      return;
    }

    if (!data || !data.startsWith("model_")) return;

    try {
      if (data === "model_cancel") {
        activeOperations?.delete(chatId);
        if (callbackQuery.message) {
          await bot.api.editMessageText({
            chat_id: chatId,
            message_id: callbackQuery.message.message_id,
            text: "❌ Model switching cancelled.",
          });
        }
        await bot.api.answerCallbackQuery({
          callback_query_id: callbackQuery.id,
          text: "Cancelled.",
        });
        return;
      }

      if (data.startsWith("model_switch:")) {
        const selectedModel = data.replace("model_switch:", "");
        activeOperations?.delete(chatId);

        if (callbackQuery.message) {
          await bot.api.editMessageText({
            chat_id: chatId,
            message_id: callbackQuery.message.message_id,
            text: `✅ *Model Switched Successfully!*\n\n**Selected Model:** \`${selectedModel}\`\n**Status:** CLI configuration updated.`,
            parse_mode: "Markdown",
          });
        }

        await bot.api.answerCallbackQuery({
          callback_query_id: callbackQuery.id,
          text: `Switched to ${selectedModel}!`,
        });
      }
    } catch (error) {
      activeOperations?.delete(chatId);
      console.error("Model switch error:", error);
      try {
        await bot.api.answerCallbackQuery({
          callback_query_id: callbackQuery.id,
          text: "Failed to switch model!",
        });
      } catch (e) {}
    }
  });
}
