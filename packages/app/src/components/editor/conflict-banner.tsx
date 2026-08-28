import { Show } from "solid-js"
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"

export interface ConflictBannerProps {
  onKeep: () => void
  onReload: () => void
  onCompare?: () => void
}

export function ConflictBanner(props: ConflictBannerProps) {
  return (
    <div class="flex items-center justify-between px-3 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-xs">
      <div class="flex items-center gap-2">
        <Icon name="warning" class="size-4 text-amber-400 shrink-0" />
        <span>
          <strong>File changed externally:</strong> The file on disk was modified by an external process or AI agent.
        </span>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <Show when={props.onCompare}>
          <Button size="small" variant="ghost" onClick={props.onCompare} class="h-6 px-2 text-xs border border-amber-500/40">
            Compare Diff
          </Button>
        </Show>
        <Button size="small" variant="ghost" onClick={props.onKeep} class="h-6 px-2 text-xs">
          Keep My Edits
        </Button>
        <Button size="small" variant="primary" onClick={props.onReload} class="h-6 px-2 text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          Reload from Disk
        </Button>
      </div>
    </div>
  )
}
