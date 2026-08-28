import { createSignal, Show } from "solid-js"
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { useTimelineSync } from "@/context/timeline-sync"
import { useBuffer } from "@/context/buffer"
import { Dialog as KobalteDialog } from "@kobalte/core/dialog"

export interface CheckpointActionsProps {
  sessionID: string
  messageID: string
  partID?: string
  isCurrentCheckpoint?: boolean
  onViewDiff?: () => void
}

export function CheckpointActions(props: CheckpointActionsProps) {
  const timeline = useTimelineSync()
  const buffer = useBuffer()
  const [showConfirm, setShowConfirm] = createSignal(false)

  const handleRewindClick = async () => {
    if (buffer.dirtyBuffers().length > 0) {
      setShowConfirm(true)
      return
    }
    await timeline.rewindToCheckpoint({
      sessionID: props.sessionID,
      messageID: props.messageID,
      partID: props.partID,
    })
  }

  const handleConfirmRewind = async (force: boolean) => {
    setShowConfirm(false)
    if (!force) {
      await buffer.saveAll()
    }
    await timeline.rewindToCheckpoint({
      sessionID: props.sessionID,
      messageID: props.messageID,
      partID: props.partID,
      force: true,
    })
  }

  return (
    <div class="flex items-center gap-1.5 text-xs select-none">
      <Show when={props.onViewDiff}>
        <button
          type="button"
          onClick={props.onViewDiff}
          class="flex items-center gap-1 px-2 py-1 rounded text-text-muted hover:text-text-base hover:bg-surface-raised transition-colors text-[11px]"
          title="View Checkpoint Diff"
        >
          <Icon name="branch" class="size-3" />
          <span>Diff</span>
        </button>
      </Show>

      <button
        type="button"
        onClick={() => void timeline.forkSession(props.sessionID, props.messageID)}
        disabled={timeline.isForking()}
        class="flex items-center gap-1 px-2 py-1 rounded text-text-muted hover:text-text-base hover:bg-surface-raised transition-colors text-[11px]"
        title="Fork Timeline from here"
      >
        <Icon name="branch" class="size-3" />
        <span>Fork</span>
      </button>

      <Button
        size="small"
        variant="secondary"
        onClick={() => void handleRewindClick()}
        disabled={timeline.isReverting() || props.isCurrentCheckpoint}
        class="h-6 px-2 text-[11px] font-medium"
        title="Rewind code & editor to this point"
      >
        <Show when={props.isCurrentCheckpoint} fallback="Rewind Here">
          Current
        </Show>
      </Button>

      {/* Dirty buffer confirmation modal */}
      <KobalteDialog open={showConfirm()} onOpenChange={setShowConfirm}>
        <KobalteDialog.Portal>
          <KobalteDialog.Overlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <KobalteDialog.Content class="fixed left-[50%] top-[50%] z-50 max-w-sm w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] p-5 bg-surface-base border border-border-base rounded-xl shadow-2xl animate-scale-in">
            <KobalteDialog.Title class="text-sm font-semibold text-text-base mb-2">
              Unsaved Changes Detected
            </KobalteDialog.Title>
            <p class="text-xs text-text-muted mb-4">
              You have {buffer.dirtyBuffers().length} unsaved file(s) in the editor. Rewinding to this checkpoint will overwrite files on disk.
            </p>

            <div class="flex items-center justify-end gap-2 text-xs">
              <Button size="small" variant="ghost" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button size="small" variant="secondary" onClick={() => void handleConfirmRewind(true)}>
                Discard & Rewind
              </Button>
              <Button size="small" variant="primary" onClick={() => void handleConfirmRewind(false)}>
                Save All & Rewind
              </Button>
            </div>
          </KobalteDialog.Content>
        </KobalteDialog.Portal>
      </KobalteDialog>
    </div>
  )
}
