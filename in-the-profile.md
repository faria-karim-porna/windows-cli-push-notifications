```txt
# Create dedicated global transcript log directory
$transcriptDir = "C:\Global-AI-Notifier\logs"
if (-not (Test-Path $transcriptDir)) { 
    New-Item -ItemType Directory -Path $transcriptDir -Force | Out-Null 
}

# Terminal session execution auto-logging
$transcriptPath = "$transcriptDir\full_terminal.log"

# Stop any existing transcript session to avoid conflicts
try { Stop-Transcript | Out-Null } catch {}

# Start logging every command and output silently
Start-Transcript -Path $transcriptPath -Append -NoClobber -ErrorAction SilentlyContinue | Out-Null

# Central log directory setup
$globalLogDir = "C:\Global-AI-Notifier\logs"
if (-not (Test-Path $globalLogDir)) { New-Item -ItemType Directory -Path $globalLogDir -Force | Out-Null }

# Antigravity (agy) CLI wrapper
function agy {
    $logPath = "C:\Global-AI-Notifier\logs\terminal.log"
    if (Test-Path $logPath) { Clear-Content $logPath }
    
    # Direct execution so TUI renders perfectly, logging via background capture if needed
    & free.cmd agy $args 2>&1 | Out-String | Out-Null
    agy.cmd $args
}

# Freebuff CLI wrapper (Direct execution to preserve TUI)
function freebuff {
    $logPath = "C:\Global-AI-Notifier\logs\terminal.log"
    if (Test-Path $logPath) { Clear-Content $logPath }
    
    # সরাসরি ফাস্ট এক্সিকিউশন যাতে ফ্রিবাফ ইন্টারফেস আটকে না যায়
    if (Get-Command freebuff.cmd -ErrorAction SilentlyContinue) {
        & freebuff.cmd $args
    } else {
        & freebuff $args
    }
}
```