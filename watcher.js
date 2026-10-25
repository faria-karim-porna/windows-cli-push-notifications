const chokidar = require('chokidar');
const fs = require('fs');
const { exec } = require('child_process');

// Watch full_terminal.log which captures all VS Code terminal & TUI output
const logFilePath = 'C:\\Global-AI-Notifier\\logs\\full_terminal.log';

console.log(`[Watcher Engine Started] Monitoring: ${logFilePath}`);

let lastFileSize = 0;

// Initialize file size to prevent triggering notifications for existing logs on startup
if (fs.existsSync(logFilePath)) {
    lastFileSize = fs.statSync(logFilePath).size;
}

// Function to send Windows Toast Notification via PowerShell (BurntToast)
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

// Watch file changes in real-time
chokidar.watch(logFilePath, {
    persistent: true,
    usePolling: true,
    interval: 500
}).on('change', (filePath) => {
    fs.stat(filePath, (err, stats) => {
        if (err) return;

        // Read only the newly appended content
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

            const lowerContent = newContent.toLowerCase();

            // 1. Task Completion Triggers
            if (
                lowerContent.includes('task completed') || 
                lowerContent.includes('finished successfully') || 
                lowerContent.includes('process done') ||
                lowerContent.includes('done!')
            ) {
                sendNotification('AI Task Completed', 'Freebuff/AGY has finished the execution.');
            }

            // 2. User Input / Prompt Required Triggers
            else if (
                lowerContent.includes('(y/n)') || 
                lowerContent.includes('allow') || 
                lowerContent.includes('confirm') || 
                lowerContent.includes('enter a coding task') ||
                lowerContent.includes('press enter') ||
                lowerContent.includes('?')
            ) {
                sendNotification('Action Required', 'Freebuff is waiting for your confirmation/input!');
            }

            // 3. Error Triggers
            else if (
                lowerContent.includes('error:') || 
                lowerContent.includes('failed to') || 
                lowerContent.includes('exception')
            ) {
                sendNotification('Execution Error', 'An error was detected in the terminal output.');
            }
        });
    });
});