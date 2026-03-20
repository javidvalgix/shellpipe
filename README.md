<div align="center">

![Shellpipe](https://providercontent.valgix.com/img/shellpipe/image.png)

**A free, local-first alternative to Termius.**  
Manage your SFTP servers from a fast, native desktop app — no subscriptions, no cloud sync, no telemetry.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![Version](https://img.shields.io/badge/version-0.1.3-green)

</div>

---

## What is Shellpipe?

Shellpipe is an open-source desktop SFTP file manager. It gives you a clean, tabbed interface to connect to any number of remote servers simultaneously, browse and manage files, run commands in an integrated terminal, and organise everything into workspaces — all stored privately on your own machine.

If you have ever been locked behind a Termius paywall for basic features like multi-tab browsing or SSH keys, Shellpipe is the answer.

---

## ⭐ Features

### Connections & Sessions
- Unlimited SFTP connection profiles with password or SSH key authentication
- Session tagging, color-coding, and notes for easy identification
- Favorite sessions for quick access
- Persistent session state across restarts

### Workspaces
- Group sessions into workspaces with custom names, icons, and colors
- Instantly switch context between projects or clients

### File Management
- Upload and download files with real-time progress tracking and cancellation
- Copy, cut, and paste across sessions
- Create, rename, and delete files and folders
- Recursive directory deletion and size calculation
- In-app file editor — read and write remote file content directly
- Multi-file selection for batch operations
- Fetch remote storage usage (total / used space)

### Navigation & Interface
- **Multi-tab browsing** — open multiple directories simultaneously per session
- Tab history (back / forward), pinning, drag-to-reorder, and close
- List, grid, and detailed view modes
- Sort by name, size, modified date, or file type (ascending / descending)
- Real-time file search and filtering
- Breadcrumb path bar with clickable segments

### Bookmarks
- Bookmark any remote path with a custom name, icon, and color
- Associate bookmarks with specific sessions
- Highlight or prioritize bookmarks from the active session

### Integrated Terminal
- Full SSH shell access in tabbed terminal panels
- Terminal resizing support

### Clipboard
- Per-session cut/copy queue with pending → success / error state tracking
- Paste between different sessions
- Up to 100 items in clipboard history

### Transfers
- Active transfer panel with live progress
- Cancel any in-flight upload or download at any time

### Customisation & Settings
- Compact or comfortable list view density
- Configurable default download path
- Auto-clear completed transfer notifications
- Dark and light theme

---

## 🔐 Security & Encryption

Shellpipe stores all session data **locally on your machine only** — nothing ever leaves your device.

Sensitive credentials (passwords and SSH key passphrases) are encrypted at rest using the **Web Crypto API** before being written to local storage:

| Property | Value |
|---|---|
| Algorithm | AES-GCM |
| Key size | 256-bit |
| Key derivation | PBKDF2 with SHA-256, 100 000 iterations |
| IV | 96-bit random per encryption operation |
| Storage format | Base64-encoded ciphertext with IV prepended |

No external encryption library is used — only the platform-native Web Crypto API built into every modern browser and WebView runtime.

---

## License

MIT — see [LICENSE](LICENSE).
