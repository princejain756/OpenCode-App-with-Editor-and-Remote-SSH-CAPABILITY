import { Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { useDAP } from "@/context/dap"

export function DebugToolbar() {
  const dap = useDAP()
  const session = () => dap.activeSession()

  return (
    <Show when={session()}>
      <div class="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-surface-base/95 backdrop-blur-md border border-border-base rounded-full shadow-2xl animate-fade-in select-none text-xs">
        <div class="flex items-center gap-1.5 pr-2 border-r border-border-base font-medium text-text-strong">
          <span class="size-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{session()?.name}</span>
          <span class="text-[10px] text-text-muted font-mono">({session()?.status})</span>
        </div>

        {/* Continue / Pause */}
        <Show
          when={session()?.status === "stopped"}
          fallback={
            <button
              type="button"
              onClick={() => void dap.pause()}
              class="p-1 rounded hover:bg-surface-raised text-amber-400 hover:text-amber-300"
              title="Pause (F6)"
            >
              <Icon name="bubble-5" class="size-4" />
            </button>
          }
        >
          <button
            type="button"
            onClick={() => void dap.resume()}
            class="p-1 rounded hover:bg-surface-raised text-emerald-400 hover:text-emerald-300"
            title="Continue (F5)"
          >
            <Icon name="arrow-right" class="size-4" />
          </button>
        </Show>

        {/* Step Over */}
        <button
          type="button"
          onClick={() => void dap.stepOver()}
          class="p-1 rounded hover:bg-surface-raised text-sky-400 hover:text-sky-300"
          title="Step Over (F10)"
        >
          <Icon name="arrow-right" class="size-4" />
        </button>

        {/* Step Into */}
        <button
          type="button"
          onClick={() => void dap.stepIn()}
          class="p-1 rounded hover:bg-surface-raised text-sky-400 hover:text-sky-300"
          title="Step Into (F11)"
        >
          <Icon name="arrow-down-to-line" class="size-4" />
        </button>

        {/* Step Out */}
        <button
          type="button"
          onClick={() => void dap.stepOut()}
          class="p-1 rounded hover:bg-surface-raised text-sky-400 hover:text-sky-300"
          title="Step Out (Shift+F11)"
        >
          <Icon name="arrow-up" class="size-4" />
        </button>

        {/* Stop */}
        <button
          type="button"
          onClick={() => void dap.stopDebugging()}
          class="p-1 rounded hover:bg-surface-raised text-rose-400 hover:text-rose-300 ml-1 pl-2 border-l border-border-base"
          title="Stop Debugging (Shift+F5)"
        >
          <Icon name="close-small" class="size-4" />
        </button>
      </div>
    </Show>
  )
}
