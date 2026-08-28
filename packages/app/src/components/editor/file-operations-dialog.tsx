import { createSignal, Show } from "solid-js"
import { Dialog as KobalteDialog } from "@kobalte/core/dialog"
import { Button } from "@opencode-ai/ui/button"
import { useBuffer } from "@/context/buffer"

export type FileOpType = "new-file" | "new-folder" | "rename" | "delete" | null

export interface FileOpState {
  type: FileOpType
  targetPath: string
  isDirectory?: boolean
}

export interface FileOperationsDialogProps {
  state: FileOpState
  onClose: () => void
}

export function FileOperationsDialog(props: FileOperationsDialogProps) {
  const buffer = useBuffer()
  const [inputValue, setInputValue] = createSignal("")

  const isOpen = () => props.state.type !== null

  const title = () => {
    switch (props.state.type) {
      case "new-file":
        return "Create New File"
      case "new-folder":
        return "Create New Folder"
      case "rename":
        return `Rename ${props.state.isDirectory ? "Folder" : "File"}`
      case "delete":
        return `Delete ${props.state.isDirectory ? "Folder" : "File"}`
      default:
        return ""
    }
  }

  const handleConfirm = async () => {
    const type = props.state.type
    const target = props.state.targetPath
    const val = inputValue().trim()

    if (type === "new-file" && val) {
      const fullPath = target ? `${target}/${val}` : val
      await buffer.createFile(fullPath)
    } else if (type === "new-folder" && val) {
      const fullPath = target ? `${target}/${val}` : val
      await buffer.createDirectory(fullPath)
    } else if (type === "rename" && val) {
      const parent = target.includes("/") ? target.slice(0, target.lastIndexOf("/")) : ""
      const newPath = parent ? `${parent}/${val}` : val
      await buffer.renamePath(target, newPath)
    } else if (type === "delete") {
      await buffer.deletePath(target, true)
    }

    setInputValue("")
    props.onClose()
  }

  return (
    <KobalteDialog open={isOpen()} onOpenChange={(open: boolean) => !open && props.onClose()}>
      <KobalteDialog.Portal>
        <KobalteDialog.Overlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <KobalteDialog.Content class="fixed left-[50%] top-[50%] z-50 max-w-sm w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] p-5 bg-surface-base border border-border-base rounded-xl shadow-2xl animate-scale-in">
          <KobalteDialog.Title class="text-base font-semibold text-text-base mb-3">{title()}</KobalteDialog.Title>

          <Show when={props.state.type !== "delete"}>
            <div class="space-y-3">
              <div class="text-xs text-text-muted">
                {props.state.type === "rename" ? "Enter new name:" : `Inside: ${props.state.targetPath || "workspace root"}`}
              </div>
              <input
                type="text"
                autofocus
                value={inputValue()}
                onInput={(e) => setInputValue(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleConfirm()
                  if (e.key === "Escape") props.onClose()
                }}
                placeholder={props.state.type === "new-folder" ? "folder_name" : "filename.ts"}
                class="w-full px-3 py-1.5 bg-surface-raised border border-border-base rounded text-sm text-text-base focus:outline-none focus:border-border-strong"
              />
            </div>
          </Show>

          <Show when={props.state.type === "delete"}>
            <div class="text-xs text-text-muted mb-4">
              Are you sure you want to permanently delete <strong class="text-text-base">{props.state.targetPath}</strong>?
              This action cannot be undone.
            </div>
          </Show>

          <div class="mt-5 flex justify-end gap-2">
            <Button variant="ghost" size="small" onClick={props.onClose}>
              Cancel
            </Button>
            <Button
              variant={props.state.type === "delete" ? "secondary" : "primary"}
              size="small"
              onClick={() => void handleConfirm()}
            >
              {props.state.type === "delete" ? "Delete" : "Confirm"}
            </Button>
          </div>
        </KobalteDialog.Content>
      </KobalteDialog.Portal>
    </KobalteDialog>
  )
}
