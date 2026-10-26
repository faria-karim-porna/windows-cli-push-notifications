const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const notifier = require('node-notifier');

const logDir = 'C:\\Global-AI-Notifier\\logs';
const freebuffLog = path.join(logDir, 'freebuff_logger.log');
const agyLog = path.join(logDir, 'agy_logger.log');

console.log(`[Watcher Engine Started] Monitoring both Freebuff and Agy logs...`);

// Independent state tracking for each tool
const states = {
    [freebuffLog]: { lastSize: 0, idleTimer: null, isProcessing: false, notificationTriggered: false, name: 'Freebuff' },
    [agyLog]: { lastSize: 0, idleTimer: null, isProcessing: false, notificationTriggered: false, name: 'Agy' }
};

// Initialize file sizes
[freebuffLog, agyLog].forEach(file => {
    if (fs.existsSync(file)) {
        states[file].lastSize = fs.statSync(file).size;
    }
});

function triggerSuccessNotification(state, reason) {
    if (state.notificationTriggered) return;

    state.notificationTriggered = true;
    state.isProcessing = false;
    clearTimeout(state.idleTimer);

    // Terminal beep sound
    process.stdout.write('\x07');

    notifier.notify(
        {
            title: `${state.name} Task Completed`,
            message: `Execution finished (${reason})`,
            sound: true,
            wait: false,
            appID: 'Global AI Notifier'
        },
        (err) => {
            if (!err) {
                console.log(`\n[Notification Sent] ${state.name} - Triggered by: ${reason}`);
            }
        }
    );
}

// Watch both log files concurrently
chokidar.watch([freebuffLog, agyLog], {
    persistent: true,
    usePolling: true,
    interval: 300
}).on('change', (filePath) => {
    const state = states[filePath];
    if (!state) return;

    fs.stat(filePath, (err, stats) => {
        if (err) return;

        // Reset state if log was cleared for a new session
        if (stats.size < state.lastSize) {
            state.lastSize = 0;
            state.isProcessing = false;
            state.notificationTriggered = false;
            clearTimeout(state.idleTimer);
            console.log(`\n[Watcher] New ${state.name} session detected. Resetting state.`);
        }

        if (stats.size === state.lastSize) return;

        const stream = fs.createReadStream(filePath, {
            start: state.lastSize,
            end: stats.size,
            encoding: 'utf8'
        });

        let newContent = '';
        stream.on('data', (chunk) => {
            newContent += chunk;
        });

        stream.on('end', () => {
            state.lastSize = stats.size;
            if (!newContent.trim()) return;

            const cleanContent = newContent.replace(/\x1B\[[0-9;]*[a-zA-K]/g, '').toLowerCase();

            // Detect active processing state (Only trigger if not already processing)
            if (
                cleanContent.includes('thinking') || 
                cleanContent.includes('working') || 
                cleanContent.includes('starting your model session')
            ) {
                if (!state.isProcessing && !state.notificationTriggered) {
                    state.isProcessing = true;
                    console.log(`\n[${state.name}] AI started processing...`);
                }
                clearTimeout(state.idleTimer);
            }

            // Only evaluate end triggers if the model was actively processing and notification hasn't been sent yet
            if (state.isProcessing && !state.notificationTriggered) {
                // 1. Direct Pattern Match on Task Completion
                if (
                    cleanContent.includes('✕ end session') || 
                    cleanContent.includes('end session') ||
                    cleanContent.includes('enter a coding task') ||
                    cleanContent.includes('add to the current task')
                ) {
                    triggerSuccessNotification(state, 'Pattern Matched');
                } else {
                    // 2. Idle Backup: Trigger if output stops for 4 seconds after active response
                    clearTimeout(state.idleTimer);
                    state.idleTimer = setTimeout(() => {
                        if (state.isProcessing && !state.notificationTriggered) {
                            triggerSuccessNotification(state, 'Terminal Idle After Work');
                        }
                    }, 3000);
                }
            }
        });

        stream.on('error', (streamErr) => {
            console.error(`[Stream Error - ${state.name}]`, streamErr.message);
        });
    });
});