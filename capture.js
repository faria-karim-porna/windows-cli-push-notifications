const pty = require("node-pty");
const fs = require("fs");
const path = require("path");

const command = process.argv[2];
const args = process.argv.slice(3);
const logDir = "C:\\Global-AI-Notifier\\logs";

if (!command) {
  console.error("No command specified.");
  process.exit(1);
}

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Select dedicated log file based on command name
let specificLogName = "terminal_fallback.log";
if (command.toLowerCase().includes("freebuff")) {
  specificLogName = "freebuff_logger.log";
} else if (command.toLowerCase().includes("agy")) {
  specificLogName = "agy_logger.log";
}

const logFile = path.join(logDir, specificLogName);

// FRESH START: Clear specific log immediately on new session start
try {
  fs.writeFileSync(logFile, "", "utf8");
} catch (e) {}

// Spawn pseudo terminal using cmd.exe
const ptyProcess = pty.spawn("cmd.exe", ["/c", command, ...args], {
  name: "xterm-color",
  cols: process.stdout.columns || 80,
  rows: process.stdout.rows || 30,
  cwd: process.cwd(),
  env: process.env,
});

// LIVE LOGGING: Write output to the specific log file and render to screen
ptyProcess.onData((data) => {
  const cleanText = data.replace(/\x1B\[[0-9;]*[a-zA-K]/g, "");
  try {
    fs.appendFileSync(logFile, cleanText, "utf8");
  } catch (e) {}
  process.stdout.write(data);
});

// USER INPUT HANDLING
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on("data", (key) => {
  if (key.toString() === "\u0003") {
    // Ctrl+C
    ptyProcess.kill();
    process.exit();
  }
  try {
    ptyProcess.write(key);
  } catch (e) {}
});

ptyProcess.onExit(({ exitCode }) => {
  process.exit(exitCode);
});
