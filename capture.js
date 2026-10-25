const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const command = process.argv[2]; 
const args = process.argv.slice(3);
const logDir = 'C:\\Global-AI-Notifier\\logs';
const logFile = path.join(logDir, 'full_terminal.log');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

if (!command) {
    console.error('No command specified.');
    process.exit(1);
}

// Spawn sub-process with piped stdio
const child = spawn(command, args, {
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
});

function writeLog(data) {
    const cleanText = data.toString().replace(/\x1B\[[0-9;]*[a-zA-K]/g, '');
    try {
        fs.appendFileSync(logFile, cleanText, 'utf8');
    } catch (e) {
        console.error('Log write error:', e.message);
    }
    process.stdout.write(data);
}

if (child.stdout) child.stdout.on('data', writeLog);
if (child.stderr) child.stderr.on('data', writeLog);

child.on('exit', (code) => {
    process.exit(code);
});