const chokidar = require("chokidar");
const fs = require("fs");
const notifier = require("node-notifier");

const logFilePath = "C:\\Global-AI-Notifier\\logs\\freebuff_logger.log";

console.log(
  `[Watcher Engine Started] Monitoring terminal logs: ${logFilePath}`,
);

let lastFileSize = 0;
let idleTimer = null;
let isProcessing = false; // Tracks if AI is currently thinking/working
let notificationTriggered = false; // Prevents repeated notifications on idle

if (fs.existsSync(logFilePath)) {
  lastFileSize = fs.statSync(logFilePath).size;
}

function triggerSuccessNotification(title, message) {
  if (notificationTriggered) return;

  notificationTriggered = true;
  isProcessing = false;
  clearTimeout(idleTimer);

  // Terminal beep sound
  process.stdout.write("\x07");

  notifier.notify(
    {
      title: title,
      message: message,
      sound: true,
      wait: false,
      icon: "C:\\Global-AI-Notifier\\freebuff-logo.png",
      appID: "Global AI Notifier",
    },
    (err) => {
      if (!err) {
        console.log(`\n[Notification Sent] Triggered by: ${title}`);
      }
    },
  );
}

chokidar
  .watch(logFilePath, {
    persistent: true,
    usePolling: true,
    interval: 300,
  })
  .on("change", (filePath) => {
    fs.stat(filePath, (err, stats) => {
      if (err) return;

      // Reset state if log is cleared for a new session
      if (stats.size < lastFileSize) {
        lastFileSize = 0;
        isProcessing = false;
        notificationTriggered = false;
        clearTimeout(idleTimer);
        console.log("\n[Watcher] New session detected. Resetting state.");
      }

      if (stats.size === lastFileSize) return;

      const stream = fs.createReadStream(filePath, {
        start: lastFileSize,
        end: stats.size,
        encoding: "utf8",
      });

      let newContent = "";
      stream.on("data", (chunk) => {
        newContent += chunk;
      });

      stream.on("end", () => {
        lastFileSize = stats.size;
        if (!newContent.trim()) return;

        const cleanContent = newContent
          .replace(/\x1B\[[0-9;]*[a-zA-K]/g, "")
          .toLowerCase();

        // Detect active processing state
        if (
          cleanContent.includes("thinking") ||
          cleanContent.includes("working") ||
          cleanContent.includes("starting your model session")
        ) {
          isProcessing = true;
          notificationTriggered = false; // Reset lock for the current task
          clearTimeout(idleTimer);
        }

        // Only evaluate end triggers if the model was actively processing
        if (isProcessing && !notificationTriggered) {
          // 1. Direct Pattern Match on Task Completion
          if (
            cleanContent.includes("some questions for you") ||
            cleanContent.includes("question for you") ||
            cleanContent.includes("do you want to") ||
            cleanContent.includes("would you like to") ||
            cleanContent.includes("once you confirm") ||
            cleanContent.includes("please confirm") ||
            cleanContent.includes("which of these should i") ||
            cleanContent.includes("do you want me to") ||
            cleanContent.includes("do you want me to continue")
          ) {
            triggerSuccessNotification(
              "❓ Freebuff: Question for You",
              "AI is waiting for your input or response!",
            );
          } else if (cleanContent.includes("✕ end session")) {
            triggerSuccessNotification(
              "✅ Freebuff: Task Finished",
              "Task completed. Enter a new coding task.",
            );
          } else {
            // 2. Idle Backup: Trigger if output stops for 3 seconds after active response
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
              if (isProcessing && !notificationTriggered) {
                triggerSuccessNotification(
                  "Terminal Idle After Work",
                  "No activity detected for 3 seconds.",
                );
              }
            }, 3000);
          }
        }
      });

      stream.on("error", (streamErr) => {
        console.error("[Stream Error]", streamErr.message);
      });
    });
  });
