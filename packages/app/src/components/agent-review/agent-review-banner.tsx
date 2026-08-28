import { Show } from "solid-js"
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { useAgentReview } from "@/context/agent-review"

export interface AgentReviewBannerProps {
  path: string
  onCompareDiff?: () => void
}

export function AgentReviewBanner(props: AgentReviewBannerProps) {
  const agentReview = useAgentReview()
  const currentChange = () => agentReview.changes[props.path]

  return (
    <Show when={currentChange() && currentChange()?.status === "pending"}>
      <div class="flex items-center justify-between px-3 py-2 bg-purple-950/40 border-b border-purple-800/50 text-xs select-none">
        <div class="flex items-center gap-2">
          <Icon name="brain" class="size-4 text-purple-400" />
          <span class="font-medium text-purple-200">
            Agent suggested modifications to this file
          </span>
          <div class="flex items-center gap-1.5 font-mono text-[11px]">
            <Show when={currentChange()!.additions > 0}>
              <span class="text-emerald-400">+{currentChange()!.additions}</span>
            </Show>
            <Show when={currentChange()!.deletions > 0}>
              <span class="text-rose-400">-{currentChange()!.deletions}</span>
            </Show>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Show when={props.onCompareDiff}>
            <Button
              size="small"
              variant="secondary"
              onClick={props.onCompareDiff}
              class="h-6 px-2 text-xs"
            >
              Compare Diff
            </Button>
          </Show>

          <Button
            size="small"
            variant="ghost"
            onClick={() => void agentReview.rejectFile(props.path)}
            class="h-6 px-2 text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-950/50"
          >
            Reject
          </Button>

          <Button
            size="small"
            variant="primary"
            onClick={() => void agentReview.acceptFile(props.path)}
            class="h-6 px-3 text-xs bg-purple-600 hover:bg-purple-500 text-white"
          >
            Accept
          </Button>
        </div>
      </div>
    </Show>
  )
}
