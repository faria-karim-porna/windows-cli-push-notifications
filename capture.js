const pty = require('node-pty');
const fs = require('fs');
const path = require('path');
const notifier = require('node-notifier');

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

// Function to send Native Windows Toast Notification using node-notifier
function sendSuccessNotification() {
    notifier.notify({
        title: 'Session Success',
        message: 'Freebuff session has completed successfully!',
        sound: true, // Play default notification sound
        wait: false
    });
    console.log('[Notification Sent] Session Success via node-notifier');
}

// FRESH START: Clear previous logs immediately when freebuff/agy starts
try {
    fs.writeFileSync(logFile, '', 'utf8');
} catch (e) {}

// Spawn pseudo terminal using cmd.exe
const ptyProcess = pty.spawn('cmd.exe', ['/c', command, ...args], {
    name: 'xterm-color',
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 30,
    cwd: process.cwd(),
    env: process.env
});

// LIVE LOGGING: Write output to full_terminal.log and render to screen
ptyProcess.onData((data) => {
    const cleanText = data.replace(/\x1B\[[0-9;]*[a-zA-K]/g, '');
    try {
        fs.appendFileSync(logFile, cleanText, 'utf8');
    } catch (e) {}
    process.stdout.write(data);
});

// USER INPUT HANDLING: Pass keyboard events to PTY
if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}

process.stdin.on('data', (key) => {
    if (key.toString() === '\u0003') { // Ctrl+C
        ptyProcess.kill();
        process.exit();
    }
    try {
        ptyProcess.write(key);
    } catch (e) {}
});

// PROCESS EXIT EVENT: Trigger success notification if exitCode is 0
ptyProcess.onExit(({ exitCode }) => {
    if (exitCode === 0) {
        sendSuccessNotification();
    }
    process.exit(exitCode);
});