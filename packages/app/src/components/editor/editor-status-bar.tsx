import { Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { useBuffer, type EditorBuffer } from "@/context/buffer"

export interface EditorStatusBarProps {
  buffer?: EditorBuffer
  onOpenSettings?: () => void
}

export function EditorStatusBar(props: EditorStatusBarProps) {
  const buffer = useBuffer()

  return (
    <div class="flex items-center justify-between px-3 py-1 bg-surface-base border-t border-border-base text-[11px] text-text-muted select-none">
      <div class="flex items-center gap-3">
        <Show when={props.buffer}>
          {(buf) => (
            <>
              <div class="flex items-center gap-1">
                <Show when={buf().isDirty}>
                  <span class="inline-block size-2 rounded-full bg-blue-500 animate-pulse" title="Unsaved changes" />
                  <span class="text-blue-400 font-medium">Unsaved</span>
                </Show>
                <Show when={!buf().isDirty && !buf().isLoading}>
                  <span class="text-text-faint">Saved</span>
                </Show>
                <Show when={buf().isLoading}>
                  <span class="text-text-faint">Loading...</span>
                </Show>
                <Show when={buf().isSaving}>
                  <span class="text-text-faint">Saving...</span>
                </Show>
              </div>

              <Show when={buf().cursor}>
                {(cursor) => (
                  <div>
                    Ln {cursor().line}, Col {cursor().column}
                  </div>
                )}
              </Show>
            </>
          )}
        </Show>
      </div>

      <div class="flex items-center gap-3">
        <Show when={props.buffer}>
          {(buf) => (
            <>
              <div>Spaces: {buffer.settings.tabSize}</div>
              <div>UTF-8</div>
              <div class="capitalize">{buf().language}</div>
            </>
          )}
        </Show>

        <button
          type="button"
          onClick={props.onOpenSettings}
          class="hover:text-text-base transition-colors flex items-center gap-1"
          title="Editor Settings"
        >
          <Icon name="sliders" class="size-3" />
        </button>
      </div>
    </div>
  )
}
