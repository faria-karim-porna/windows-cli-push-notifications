export function registerStopCommand(bot, userStates, activeOperations) {
  bot.command("stop", async (ctx) => {
    const chatId = ctx.chat.id;
    console.log(`[CMD] /stop triggered by ${chatId}`);

    let wasRunning = false;

    // ১. চলমান প্রসেস বা ব্যাকগ্রাউন্ড লুপ অ্যাবোর্ট করা
    if (activeOperations && activeOperations.has(chatId)) {
      const operation = activeOperations.get(chatId);
      if (operation && operation.controller) {
        operation.controller.abort();
      }
      activeOperations.delete(chatId);
      wasRunning = true;
    }

    // ২. মাল্টি-স্টেপ কমান্ড স্টেট বা ইউজার ইনপুট স্টেট রিসেট করা
    if (userStates && userStates.has(chatId)) {
      userStates.delete(chatId);
      wasRunning = true;
    }

    if (wasRunning) {
      await ctx.reply(
        "🛑 *Operation Stopped Successfully!*\n\nAll ongoing processes, active workflows, and inputs have been cancelled.",
        { parse_mode: "Markdown" },
      );
    } else {
      await ctx.reply(
        "ℹ️ No active operations or workflows are currently running.",
        { parse_mode: "Markdown" },
      );
    }
  });
}
