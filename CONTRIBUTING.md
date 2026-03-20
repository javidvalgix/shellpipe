# Contributing to Shellpipe

Thank you for your interest in contributing to **Shellpipe** — a free, local-first alternative to Termius. Every contribution, from a typo fix to a major feature, is genuinely appreciated.

Please read this guide fully before opening an issue or submitting a pull request. Following it helps maintainers review and merge your work faster.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Project Architecture](#project-architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Fork & Clone](#fork--clone)
  - [Install Dependencies](#install-dependencies)
  - [Run Locally](#run-locally)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
  - [TypeScript / React](#typescript--react)
  - [Rust](#rust)
  - [Styling (Tailwind CSS)](#styling-tailwind-css)
- [Commit Message Convention](#commit-message-convention)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Security Vulnerabilities](#security-vulnerabilities)
- [License](#license)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to uphold these standards. Please report unacceptable behaviour to the project maintainers.

---

## Ways to Contribute

| Type | Examples |
|---|---|
| 🐛 Bug fix | Crash on file rename, broken upload progress, incorrect path display |
| ✨ Feature | New view mode, additional authentication method, keyboard shortcut |
| ⚡ Performance | Faster directory listing, reduced re-renders, memory footprint |
| 🔒 Security | Credential handling, encryption improvements, dependency audits |
| 📝 Documentation | README, inline code comments, this file |
| 🎨 UX / Design | Accessibility, visual polish, dark/light theme consistency |
| 🧹 Refactor / Clean-up | Removing dead code, improving type safety, code organisation |
| 🌐 Translation | Adding or improving locale strings |

---

## Project Architecture

Shellpipe is a **Tauri v2** application built with:

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + TypeScript + Vite | All UI, dialogs, state management |
| **State** | Zustand (with persistence middleware) | Session, file, clipboard, workspace state |
| **UI Components** | shadcn/ui + Radix UI primitives | Accessible, composable component library |
| **Styling** | Tailwind CSS v4 | Utility-first styling |
| **Backend / Native** | Tauri v2 (Rust) | Window management, OS integration, Tauri commands |
| **SSH / SFTP** | `ssh2` crate (Rust) | Actual SSH and SFTP networking |
| **Terminal** | `xterm.js` + Tauri shell | In-app SSH terminal emulation |
| **Encryption** | Web Crypto API (AES-GCM / PBKDF2) | Credential encryption at rest |

### Key Data Flows

```
User action (React)
  → Zustand store mutation
    → Tauri `invoke()` call (if native operation needed)
      → Rust command handler (src-tauri/src/)
        → ssh2 / filesystem
      ← Result / error struct
    ← Store update
  ← Re-render
```

---

## Getting Started

### Prerequisites

Install all of the following before you begin:

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | ≥ 20 LTS | Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) |
| **Bun** | latest | Install via [bun.sh](https://bun.sh) — used as package manager and runtime |
| **Rust** | stable (latest) | Install via [rustup.rs](https://rustup.rs) |
| **Tauri CLI** | v2 | `cargo install tauri-cli --version "^2"` |
| **OS build deps** | — | See [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS |

> **Windows users:** Install the [WebView2 runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) if it isn't already present (ships with Windows 11 by default).

### Fork & Clone

```bash
# 1. Fork the repo via GitHub, then:
git clone https://github.com/<your-username>/shellpipe.git
cd shellpipe

# 2. Add the upstream remote
git remote add upstream https://github.com/javidvalgix/shellpipe.git
```

### Install Dependencies

```bash
bun install
```

### Run Locally

```bash
# Start the Tauri development build (hot-reloads both Vite and Rust on change)
bun run tauri dev
```

The first run will compile the Rust crate — this can take a couple of minutes. Subsequent runs are much faster thanks to incremental compilation.

> **Tip:** if you only need to work on UI logic that doesn't touch Tauri commands, you can run `bun run dev` for a browser-only Vite dev server, though some native features won't be available.

---

## Project Structure

```
shellpipe/
├── src/                        # React / TypeScript frontend
│   ├── components/             # Shared UI components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── sidebar/            # Session & workspace sidebar items
│   │   └── magicui/            # Decorative / animated UI pieces
│   ├── dialogs/                # Modal dialogs (create session, settings, etc.)
│   ├── hooks/                  # Custom React hooks
│   ├── layout/                 # Page-level layout components (file browser, bookmarks, …)
│   ├── lib/                    # Utilities shared across the frontend
│   ├── models/                 # TypeScript model/interface definitions
│   ├── stores/                 # Zustand stores (session, tab, clipboard, …)
│   ├── styles/                 # Global CSS and Tailwind base styles
│   ├── types/                  # Shared TypeScript type definitions
│   └── utils/                  # Pure utility functions
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs             # Tauri app entry point & command registration
│   │   ├── types.rs            # Shared Rust types / structs
│   │   ├── sftp/               # SFTP command handlers (upload, download, ls, …)
│   │   └── terminal/           # SSH terminal command handlers
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration (window, permissions, updater)
├── public/                     # Static assets served by Vite
└── index.html                  # Vite entry HTML
```

---

## Development Workflow

1. **Sync with upstream** before starting any work:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch** from `main`:  
   Use a descriptive name that reflects the work.
   ```bash
   git checkout -b feat/multi-session-paste
   # or
   git checkout -b fix/upload-progress-flicker
   ```

3. **Make your changes.** Keep commits small and focused — one logical change per commit.

4. **Lint & type-check** before committing:
   ```bash
   bun run build        # catches TypeScript errors
   ```
   For Rust:
   ```bash
   cd src-tauri
   cargo clippy -- -D warnings
   cargo fmt --check
   ```

5. **Push your branch** and open a PR against `main`.

---

## Coding Standards

### TypeScript / React

- **Strict TypeScript** — do not use `any` unless absolutely unavoidable; prefer narrower types or generics.
- **Functional components only** — no class-based components.
- **Hooks** — follow the [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks). Extract reusable logic into custom hooks under `src/hooks/`.
- **State** — use the appropriate Zustand store. Do not use `React.useState` for data that is shared across the component tree.
- **Naming**:
  - Components: `PascalCase`
  - Hooks: `useCamelCase`
  - Stores: `camelCase.store.ts`
  - Types / Models: `PascalCase`
- **Imports** — prefer named imports over default imports where it aids readability.
- **No dead code** — remove commented-out code before submitting.
- **Accessibility** — use semantic HTML and Radix UI primitives where possible. Ensure interactive elements are keyboard-accessible.

### Rust

- Follow idiomatic Rust: prefer `Result` / `Option` over panics.
- Run **`cargo fmt`** before every commit.
- Run **`cargo clippy -- -D warnings`** and resolve all warnings.
- Document public functions and structs with `///` doc comments.
- Tauri command handlers should be thin — delegate real logic to modules under `sftp/` and `terminal/`.
- Error types should be serialisable so they surface cleanly to the frontend via `tauri::Error` / `serde_json`.

### Styling (Tailwind CSS)

- Use Tailwind utility classes; avoid inline `style` props.
- Respect the existing colour and spacing tokens — do not introduce arbitrary values where a design token exists.
- Dark-mode variants (`dark:`) are required for any new styled element.
- Components that vary by size or intent should use `class-variance-authority` (CVA) variants, following the pattern in `src/components/ui/`.

---

## Commit Message Convention

Shellpipe follows **[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)**.

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Types

| Type | Use for |
|---|---|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `perf` | Performance improvement |
| `refactor` | Code change that doesn't fix a bug or add a feature |
| `style` | Formatting, missing semicolons, etc. (no logic change) |
| `docs` | Documentation only |
| `test` | Adding or correcting tests |
| `chore` | Dependency updates, build scripts, CI config |
| `security` | Security-related change |

### Scope (optional but encouraged)

Use the area of the codebase affected, e.g.:  
`sftp`, `terminal`, `session`, `bookmarks`, `clipboard`, `transfer`, `sidebar`, `settings`, `ui`, `deps`

### Examples

```
feat(sftp): add bulk rename with pattern matching
fix(terminal): prevent session crash on window resize race condition
perf(sidebar): memoize workspace session list to reduce re-renders
docs: document encryption key setup in README
chore(deps): bump ssh2 to 0.10.1
security: derive encryption key per-device instead of using a shared salt
```

> **Breaking changes:** append `!` after the type/scope and include a `BREAKING CHANGE:` footer.

---

## Submitting a Pull Request

1. **One PR per concern** — do not mix a bug fix with a refactor with a new feature. Split them.

2. **Fill in the PR template** completely:
   - What does this change do?
   - Why is this change needed?
   - How was it tested?
   - Screenshots / recordings (for UI changes).

3. **Keep the PR diff focused** — avoid unrelated whitespace changes or import reordering in files you did not otherwise touch.

4. **Reference related issues** — use `Closes #123` in the PR description to auto-close an issue on merge.

5. **All CI checks must pass** before a review is requested.

6. **Respond to review comments** promptly. If you disagree, explain why — all feedback is a conversation, not a command.

7. **Do not force-push** to a PR branch after review has started; use incremental commits so reviewers can see what changed.

### Review Checklist (for reviewers)

- [ ] The change does what the PR description says
- [ ] No regressions in existing behaviour
- [ ] TypeScript types are correct and `any` is not misused
- [ ] Rust code compiles cleanly with `cargo clippy -- -D warnings`
- [ ] Sensitive data (credentials, keys) is never logged or exposed
- [ ] New UI elements work in both light and dark mode
- [ ] Accessibility is not regressed

---

## Reporting Bugs

Search [existing issues](../../issues) first. If your bug is not already reported, open a new issue and include:

- **Shellpipe version** and OS / OS version
- **Steps to reproduce** — be as precise as possible
- **Expected behaviour** vs **actual behaviour**
- **Relevant logs** — open DevTools (`Ctrl+Shift+I` / `Cmd+Option+I`) → Console and paste any errors
- **Screenshot or recording** (strongly encouraged for UI bugs)

> ⚠️ **Never include real SSH passwords, private keys, or passphrases in a bug report.**

---

## Requesting Features

Open a [Feature Request issue](../../issues/new) and describe:

1. **The problem** you are trying to solve (not just the solution you have in mind)
2. **Your proposed solution** (optional but helpful)
3. **Alternatives you have considered**
4. **Who would benefit** (just you, a power-user niche, most users?)

Features are more likely to be accepted when they:
- Align with the project goal (local-first, privacy-respecting SFTP management)
- Are implementable without adding heavy new dependencies
- Include a concrete proposal rather than a vague wish

---

## Security Vulnerabilities

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately to the maintainer. Include:

- A clear description of the vulnerability
- Steps to reproduce or a proof of concept
- The potential impact

You will receive a response within 72 hours. We will work with you to understand and patch the issue before any public disclosure.

See the existing security model for context:

| Concern | Current implementation |
|---|---|
| Credential storage | AES-GCM 256-bit, PBKDF2 key derivation, local only |
| Encryption IV | 96-bit random per encrypt operation |
| Data never leaves device | No telemetry, no cloud sync |
| Known limitation | Salt is currently static — improvements welcome |

---

## License

By contributing you agree that your contributions will be licensed under the [MIT License](LICENSE) that covers this project. You retain copyright over your own contribution, but grant the project a perpetual, irrevocable, royalty-free licence to use it.

---

*Happy hacking! 🚀 If you get stuck, open a Discussion or leave a comment on the relevant issue — we are happy to help.*
