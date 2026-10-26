const pty = require('node-pty');
const fs = require('fs');
const path = require('path');

const command = process.argv[2];
const args = process.argv.slice(3);
const logDir = 'C:\\Global-AI-Notifier\\logs';
const logFile = path.join(logDir, 'full_terminal.log');

if (!command) {
    console.error('No command specified.');
    process.exit(1);
}

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Spawn pseudo terminal using cmd.exe to correctly resolve global CLI tools (like freebuff or agy)
const ptyProcess = pty.spawn('cmd.exe', ['/c', command, ...args], {
    name: 'xterm-color',
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 30,
    cwd: process.cwd(),
    env: process.env
});

// Write terminal output to full_terminal.log and render to screen safely
ptyProcess.onData((data) => {
    // Strip ANSI escape codes to keep log text clean and readable
    const cleanText = data.replace(/\x1B\[[0-9;]*[a-zA-K]/g, '');
    try {
        fs.appendFileSync(logFile, cleanText, 'utf8');
    } catch (e) {
        // Silently handle file write locks
    }
    process.stdout.write(data);
});

// Handle user keyboard inputs
if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}

process.stdin.on('data', (key) => {
    // Graceful exit on Ctrl+C
    if (key.toString() === '\u0003') {
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