import { For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { FileIcon } from "@opencode-ai/ui/file-icon"

export interface BreadcrumbsProps {
  path: string
  onSegmentClick?: (subpath: string) => void
}

export function Breadcrumbs(props: BreadcrumbsProps) {
  const segments = () => {
    const raw = props.path.replace(/\\/g, "/")
    const parts = raw.split("/").filter(Boolean)
    return parts.map((part, index) => ({
      name: part,
      path: parts.slice(0, index + 1).join("/"),
      isLast: index === parts.length - 1,
    }))
  }

  return (
    <div class="flex items-center gap-1 px-3 py-1.5 text-xs text-text-muted bg-surface-base border-b border-border-base select-none overflow-x-auto no-scrollbar">
      <For each={segments()}>
        {(seg) => (
          <div class="flex items-center gap-1 shrink-0">
            <Show
              when={seg.isLast}
              fallback={
                <button
                  type="button"
                  onClick={() => props.onSegmentClick?.(seg.path)}
                  class="hover:text-text-base transition-colors truncate max-w-[150px]"
                >
                  {seg.name}
                </button>
              }
            >
              <div class="flex items-center gap-1.5 text-text-base font-medium">
                <FileIcon node={{ path: seg.path, type: "file" }} class="size-3.5" />
                <span class="truncate max-w-[200px]">{seg.name}</span>
              </div>
            </Show>
            <Show when={!seg.isLast}>
              <Icon name="chevron-right" class="size-3 text-text-faint shrink-0" />
            </Show>
          </div>
        )}
      </For>
    </div>
  )
}
