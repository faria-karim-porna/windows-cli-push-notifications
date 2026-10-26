const chokidar = require('chokidar');
const fs = require('fs');
const { exec } = require('child_process');

const logFilePath = 'C:\\Global-AI-Notifier\\logs\\full_terminal.log';

console.log(`[Watcher Engine Started] Monitoring: ${logFilePath}`);

let lastFileSize = 0;

if (fs.existsSync(logFilePath)) {
    lastFileSize = fs.statSync(logFilePath).size;
}

function sendNotification(title, message) {
    const psCommand = `PowerShell -Command "New-BurntToastNotification -Text '${title}', '${message}'"`;
    
    exec(psCommand, (error) => {
        if (error) {
            console.error(`[Error] Failed to send notification: ${error.message}`);
        } else {
            console.log(`[Notification Sent] ${title}: ${message}`);
        }
    });
}

chokidar.watch(logFilePath, {
    persistent: true,
    usePolling: true,
    interval: 500
}).on('change', (filePath) => {
    fs.stat(filePath, (err, stats) => {
        if (err) return;

        // If log file was truncated/cleared, reset lastFileSize to 0
        if (stats.size < lastFileSize) {
            lastFileSize = 0;
        }

        if (stats.size === lastFileSize) return;

        const stream = fs.createReadStream(filePath, {
            start: lastFileSize,
            end: stats.size,
            encoding: 'utf8'
        });

        let newContent = '';
        stream.on('data', (chunk) => {
            newContent += chunk;
        });

        stream.on('end', () => {
            lastFileSize = stats.size;

            if (!newContent.trim()) return;

            const cleanContent = newContent.replace(/\x1B\[[0-9;]*[a-zA-K]/g, '').toLowerCase();

            // Check if session has ended
            if (cleanContent.includes('end session') || cleanContent.includes('✕ end session')) {
                sendNotification('Session Success', 'Freebuff session has ended successfully!');
            }
            else if (cleanContent.includes('task completed') || cleanContent.includes('finished')) {
                sendNotification('AI Task Completed', 'Freebuff has finished the task execution.');
            }
        });

        stream.on('error', (streamErr) => {
            console.error('[Stream Error]', streamErr.message);
        });
    });
});