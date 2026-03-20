import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import useTabStore from "@/stores/tab.store";
import useSessionStore from "@/stores/session.store";
import SessionPickerView from "./session-picker-view";

interface TerminalViewProps {
    tabId: string;
}

export default function TerminalView({ tabId }: TerminalViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    // Stable terminal ID per mount – does not change on re-renders.
    const terminalIdRef = useRef<string>(crypto.randomUUID());

    const tab = useTabStore((state) => state.getTabById(tabId));
    const getDecryptedConnectionConfig = useSessionStore(
        (state) => state.getDecryptedConnectionConfig
    );

    useEffect(() => {
        if (!containerRef.current || !tab?.session) return;

        const terminalId = terminalIdRef.current;
        const container = containerRef.current;

        // --- Initialise xterm ---
        const xterm = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            scrollback: 5000,
            theme: {
                background: "#1a1a1a",
                foreground: "#d4d4d4",
                cursor: "#d4d4d4",
                selectionBackground: "#264f78",
                black: "#1e1e1e",
                brightBlack: "#808080",
                red: "#f44747",
                brightRed: "#f44747",
                green: "#608b4e",
                brightGreen: "#608b4e",
                yellow: "#dcdcaa",
                brightYellow: "#dcdcaa",
                blue: "#569cd6",
                brightBlue: "#569cd6",
                magenta: "#c678dd",
                brightMagenta: "#c678dd",
                cyan: "#56b6c2",
                brightCyan: "#56b6c2",
                white: "#d4d4d4",
                brightWhite: "#e5e5e5",
            },
        });

        const fitAddon = new FitAddon();
        xterm.loadAddon(fitAddon);
        xterm.open(container);
        fitAddon.fit();

        let dataUnlisten: UnlistenFn | null = null;
        let closeUnlisten: UnlistenFn | null = null;
        let resizeObserver: ResizeObserver | null = null;

        // Right-click: copy selection if text is selected, otherwise paste clipboard.
        // Attached synchronously so the effect cleanup reliably removes it.
        const handleContextMenu = async (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const selection = xterm.getSelection();
            if (selection) {
                await navigator.clipboard.writeText(selection).catch(console.error);
                xterm.clearSelection();
            } else {
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        const bytes = Array.from(new TextEncoder().encode(text));
                        invoke("terminal_write", { terminalId, data: bytes }).catch(console.error);
                    }
                } catch {
                    // Clipboard read failed – silently ignore
                }
            }
        };
        container.addEventListener("contextmenu", handleContextMenu);

        const setup = async () => {
            // Subscribe to data arriving from the remote shell.
            dataUnlisten = await listen<number[]>(
                `terminal_data:${terminalId}`,
                (event) => {
                    xterm.write(new Uint8Array(event.payload));
                }
            );

            // Subscribe to shell-closed notifications.
            closeUnlisten = await listen<void>(
                `terminal_closed:${terminalId}`,
                () => {
                    xterm.writeln("\r\n\x1b[90m[session closed]\x1b[0m");
                    // Mark disconnected only if no other tab still uses this session
                    const sessionId = tab?.session?.id;
                    if (sessionId) {
                        const remaining = useTabStore.getState().tabs.filter(
                            (t) => t.id !== tabId && t.session?.id === sessionId
                        );
                        if (remaining.length === 0) {
                            useSessionStore.getState().updateSessionStatus(sessionId, "disconnected");
                        }
                    }
                }
            );

            // Get decrypted credentials and open the terminal on the backend.
            const config = await getDecryptedConnectionConfig(tab!.session!.id);
            if (!config) {
                xterm.writeln(
                    "\x1b[31mError: could not retrieve connection credentials.\x1b[0m"
                );
                return;
            }

            xterm.writeln(
                `\x1b[90mConnecting to ${config.host}…\x1b[0m`
            );

            try {
                await invoke("terminal_open", { config, terminalId });
                // Mark the session as connected in the store (SSH)
                useSessionStore.getState().updateSessionStatus(tab!.session!.id, "connected");
            } catch (err) {
                xterm.writeln(`\x1b[31mConnection error: ${err}\x1b[0m`);
            }

            // Forward keyboard input to the backend.
            xterm.onData((data) => {
                const bytes = Array.from(new TextEncoder().encode(data));
                invoke("terminal_write", { terminalId, data: bytes }).catch(
                    console.error
                );
            });

            // Forward resize events to the backend.
            xterm.onResize(({ cols, rows }) => {
                invoke("terminal_resize", {
                    terminalId,
                    cols,
                    rows,
                }).catch(console.error);
            });

            // Keep the terminal sized to its container.
            resizeObserver = new ResizeObserver(() => {
                fitAddon.fit();
            });
            resizeObserver.observe(container);
        };

        setup();

        return () => {
            container.removeEventListener("contextmenu", handleContextMenu);
            resizeObserver?.disconnect();
            dataUnlisten?.();
            closeUnlisten?.();
            invoke("terminal_close", { terminalId }).catch(console.error);
            xterm.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tabId, tab?.session?.id]);

    if (!tab?.session) {
        return <SessionPickerView tabId={tabId} mode="terminal" />;
    }

    return (
        <div
            ref={containerRef}
            className="w-full h-full overflow-hidden"
            style={{ background: "#1a1a1a", padding: "8px" }}
        />
    );
}
