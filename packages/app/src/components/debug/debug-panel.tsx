import { createSignal, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Button } from "@opencode-ai/ui/button"
import { useDAP, type LaunchConfig } from "@/context/dap"
import { useBuffer } from "@/context/buffer"

export function DebugPanel(props: { onClose?: () => void }) {
  const dap = useDAP()
  const buffer = useBuffer()

  const [selectedConfig, setSelectedConfig] = createSignal<string>("node-current")
  const [consoleInput, setConsoleInput] = createSignal("")

  const launchConfigs = (): LaunchConfig[] => [
    {
      name: "Launch Current File (Bun / Node)",
      type: "bun",
      request: "launch",
      program: buffer.activePath(),
    },
    {
      name: "Launch Python File",
      type: "python",
      request: "launch",
      program: buffer.activePath(),
    },
    {
      name: "Attach to Process (Port 9229)",
      type: "node",
      request: "attach",
      port: 9229,
    },
  ]

  const handleStart = async () => {
    const idx = parseInt(selectedConfig(), 10) || 0
    const cfg = launchConfigs()[idx] ?? launchConfigs()[0]
    await dap.startDebugging(cfg)
  }

  const handleEval = (e: Event) => {
    e.preventDefault()
    const expr = consoleInput().trim()
    if (!expr) return
    void dap.evaluate(expr)
    setConsoleInput("")
  }

  return (
    <div class="flex flex-col h-full w-full bg-surface-base border-r border-border-base select-none text-xs">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-2 border-b border-border-base bg-surface-raised/50">
        <div class="flex items-center gap-2">
          <Icon name="brain" class="size-4 text-text-muted" />
          <span class="text-xs font-semibold text-text-strong uppercase tracking-wider">Run & Debug</span>
        </div>
        <Show when={props.onClose}>
          <IconButton icon="close-small" variant="ghost" class="size-5" onClick={props.onClose} />
        </Show>
      </div>

      {/* Launch Config & Start */}
      <div class="p-2 border-b border-border-base bg-surface-raised/20 space-y-2">
        <select
          value={selectedConfig()}
          onChange={(e) => setSelectedConfig(e.currentTarget.value)}
          class="w-full px-2 py-1 bg-surface-raised border border-border-base rounded text-xs text-text-base focus:outline-none"
        >
          <For each={launchConfigs()}>
            {(cfg, idx) => <option value={String(idx())}>{cfg.name}</option>}
          </For>
        </select>

        <Show
          when={!dap.activeSession()}
          fallback={
            <Button
              size="small"
              variant="secondary"
              onClick={() => void dap.stopDebugging()}
              class="w-full text-rose-400 hover:text-rose-300"
            >
              Stop Debugging
            </Button>
          }
        >
          <Button
            size="small"
            variant="primary"
            onClick={handleStart}
            disabled={dap.isOperating()}
            class="w-full font-medium"
          >
            ▶ Start Debugging
          </Button>
        </Show>
      </div>

      {/* Main Debugging Sections */}
      <div class="flex-1 min-h-0 overflow-y-auto p-2 space-y-3">
        {/* Variables */}
        <div>
          <div class="font-semibold text-[11px] text-text-muted mb-1 px-1">VARIABLES</div>
          <div class="bg-surface-raised/30 rounded border border-border-base/50 p-1.5 space-y-1 font-mono text-[11px]">
            <Show
              when={dap.variables.length > 0}
              fallback={<div class="text-text-faint text-[10px]">No active scope</div>}
            >
              <For each={dap.variables}>
                {(v) => (
                  <div class="flex items-center justify-between truncate">
                    <span class="text-sky-400">{v.name}:</span>
                    <span class="text-text-base truncate">{v.value}</span>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>

        {/* Call Stack */}
        <div>
          <div class="font-semibold text-[11px] text-text-muted mb-1 px-1">CALL STACK</div>
          <div class="bg-surface-raised/30 rounded border border-border-base/50 p-1.5 space-y-1 text-[11px]">
            <Show
              when={dap.stackFrames.length > 0}
              fallback={<div class="text-text-faint text-[10px]">Not paused</div>}
            >
              <For each={dap.stackFrames}>
                {(f) => (
                  <div
                    onClick={() => void buffer.loadBuffer(f.file)}
                    class="p-1 rounded hover:bg-surface-raised cursor-pointer font-mono truncate text-text-base flex items-center justify-between"
                  >
                    <span class="text-emerald-400">{f.name}</span>
                    <span class="text-text-muted text-[10px]">
                      {f.file.split("/").pop()}:{f.line}
                    </span>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>

        {/* Breakpoints */}
        <div>
          <div class="font-semibold text-[11px] text-text-muted mb-1 px-1">BREAKPOINTS</div>
          <div class="bg-surface-raised/30 rounded border border-border-base/50 p-1.5 space-y-1 text-[11px]">
            <Show
              when={Object.keys(dap.breakpoints).length > 0}
              fallback={<div class="text-text-faint text-[10px]">No breakpoints set (click gutter to add)</div>}
            >
              <For each={Object.entries(dap.breakpoints)}>
                {([file, lines]) => (
                  <For each={lines}>
                    {(line) => (
                      <div
                        onClick={() => void buffer.loadBuffer(file)}
                        class="flex items-center justify-between p-1 rounded hover:bg-surface-raised cursor-pointer text-xs group"
                      >
                        <div class="flex items-center gap-1.5 truncate">
                          <span class="size-2 rounded-full bg-rose-500 shrink-0" />
                          <span class="truncate font-mono text-text-base">
                            {file.split("/").pop()}:{line}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void dap.toggleBreakpoint(file, line)
                          }}
                          class="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-text-faint"
                        >
                          <Icon name="close-small" class="size-3" />
                        </button>
                      </div>
                    )}
                  </For>
                )}
              </For>
            </Show>
          </div>
        </div>

        {/* Debug Console REPL */}
        <div>
          <div class="font-semibold text-[11px] text-text-muted mb-1 px-1">DEBUG CONSOLE</div>
          <div class="bg-surface-raised/40 rounded border border-border-base/60 p-2 space-y-2">
            <div class="max-h-28 overflow-y-auto space-y-1 font-mono text-[10px]">
              <For each={dap.consoleLogs}>
                {(log) => (
                  <div
                    class={
                      log.type === "error"
                        ? "text-rose-400"
                        : log.type === "output"
                        ? "text-emerald-400"
                        : "text-sky-300"
                    }
                  >
                    {log.type === "input" ? "> " : ""}
                    {log.text}
                  </div>
                )}
              </For>
            </div>
            <form onSubmit={handleEval} class="flex gap-1">
              <input
                type="text"
                placeholder="Evaluate expression..."
                value={consoleInput()}
                onInput={(e) => setConsoleInput(e.currentTarget.value)}
                class="flex-1 px-2 py-0.5 bg-surface-base border border-border-base rounded text-[11px] font-mono text-text-base focus:outline-none"
              />
              <Button size="small" variant="secondary" type="submit" class="h-6 px-2 text-[10px]">
                Eval
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
