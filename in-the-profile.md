```txt
# Set execution policy
Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope CurrentUser -Force

# Log directory setup
$globalLogDir = "C:\Global-AI-Notifier\logs"
if (-not (Test-Path $globalLogDir)) { 
    New-Item -ItemType Directory -Path $globalLogDir -Force | Out-Null 
}

# --- CLI Wrappers using Node-PTY (capture.js) ---

function agy {
    node "C:\Global-AI-Notifier\capture.js" agy $args
}

function freebuff {
    node "C:\Global-AI-Notifier\capture.js" freebuff $args
}
```