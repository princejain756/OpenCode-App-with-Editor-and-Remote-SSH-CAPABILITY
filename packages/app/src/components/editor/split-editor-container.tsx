import { Show } from "solid-js"
import { MonacoEditor } from "./monaco-editor"
import { useSplitEditor } from "@/context/split-editor"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { IconButton } from "@opencode-ai/ui/icon-button"

export interface SplitEditorContainerProps {
  primaryPath: string
  class?: string
}

export function SplitEditorContainer(props: SplitEditorContainerProps) {
  const split = useSplitEditor()

  return (
    <div class={`relative size-full flex overflow-hidden ${props.class ?? ""}`}>
      <Show
        when={split.splitDirection() !== "none" && split.secondaryPath()}
        fallback={<MonacoEditor path={props.primaryPath} class="size-full" />}
      >
        <div
          class="flex size-full overflow-hidden"
          classList={{
            "flex-row": split.splitDirection() === "vertical",
            "flex-col": split.splitDirection() === "horizontal",
          }}
        >
          {/* Primary Pane */}
          <div
            class="overflow-hidden min-w-0 min-h-0 relative"
            style={{
              flex: `${split.splitRatio()} 1 0%`,
            }}
          >
            <MonacoEditor path={props.primaryPath} class="size-full" />
          </div>

          {/* Resizer */}
          <ResizeHandle
            direction={split.splitDirection() === "vertical" ? "horizontal" : "vertical"}
            size={split.splitRatio() * 100}
            min={20}
            max={80}
            onResize={(size) => {
              split.setSplitRatio(size / 100)
            }}
          />

          {/* Secondary Pane */}
          <div
            class="overflow-hidden min-w-0 min-h-0 relative border-l border-border-base"
            style={{
              flex: `${1 - split.splitRatio()} 1 0%`,
            }}
          >
            <div class="absolute top-1 right-2 z-10">
              <IconButton
                icon="close-small"
                variant="ghost"
                class="size-5 bg-surface-base/80 hover:bg-surface-raised"
                onClick={() => split.closeSecondary()}
                title="Close Split Pane"
              />
            </div>
            <MonacoEditor path={split.secondaryPath()!} class="size-full" />
          </div>
        </div>
      </Show>
    </div>
  )
}
