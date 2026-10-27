const chokidar = require('chokidar');
const fs = require('fs');
const notifier = require('node-notifier');

const logFilePath = 'C:\\Global-AI-Notifier\\logs\\agy_logger.log';

console.log(`[Watcher Engine Started] Monitoring terminal logs: ${logFilePath}`);

let lastFileSize = 0;
let idleTimer = null;
let isProcessing = false;        // Tracks if AI is currently thinking/working
let notificationTriggered = false; // Prevents repeated notifications on idle

if (fs.existsSync(logFilePath)) {
    lastFileSize = fs.statSync(logFilePath).size;
}

function triggerSuccessNotification(reason) {
    if (notificationTriggered) return;

    notificationTriggered = true;
    isProcessing = false;
    clearTimeout(idleTimer);

    // Terminal beep sound
    process.stdout.write('\x07');

    notifier.notify(
        {
            title: 'agy Task Completed',
            message: `Execution finished (${reason})`,
            sound: true,
            wait: false,
            appID: 'Global AI Notifier'
        },
        (err) => {
            if (!err) {
                console.log(`\n[Notification Sent] Triggered by: ${reason}`);
            }
        }
    );
}

chokidar.watch(logFilePath, {
    persistent: true,
    usePolling: true,
    interval: 300
}).on('change', (filePath) => {
    fs.stat(filePath, (err, stats) => {
        if (err) return;

        // Reset state if log is cleared for a new session
        if (stats.size < lastFileSize) {
            lastFileSize = 0;
            isProcessing = false;
            notificationTriggered = false;
            clearTimeout(idleTimer);
            console.log('\n[Watcher] New session detected. Resetting state.');
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

            // Detect active processing state
            if (
                cleanContent.includes('thinking') || 
                cleanContent.includes('working') || 
                cleanContent.includes('starting your model session')
            ) {
                isProcessing = true;
                notificationTriggered = false; // Reset lock for the current task
                clearTimeout(idleTimer);
            }

            // Only evaluate end triggers if the model was actively processing
            if (isProcessing && !notificationTriggered) {
                // 1. Direct Pattern Match on Task Completion
                if (
                    cleanContent.includes('✕ end session') || 
                    cleanContent.includes('enter a coding task') ||
                    cleanContent.includes('add to the current task')
                ) {
                    triggerSuccessNotification('Pattern Matched');
                } else {
                    // 2. Idle Backup: Trigger if output stops for 3 seconds after active response
                    clearTimeout(idleTimer);
                    idleTimer = setTimeout(() => {
                        if (isProcessing && !notificationTriggered) {
                            triggerSuccessNotification('Terminal Idle After Work');
                        }
                    }, 3000);
                }
            }
        });

        stream.on('error', (streamErr) => {
            console.error('[Stream Error]', streamErr.message);
        });
    });
});