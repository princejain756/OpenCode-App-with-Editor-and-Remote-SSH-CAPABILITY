import { Dialog as KobalteDialog } from "@kobalte/core/dialog"
import { useBuffer } from "@/context/buffer"

export interface EditorSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditorSettingsDialog(props: EditorSettingsDialogProps) {
  const buffer = useBuffer()

  return (
    <KobalteDialog open={props.open} onOpenChange={props.onOpenChange}>
      <KobalteDialog.Portal>
        <KobalteDialog.Overlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <KobalteDialog.Content class="fixed left-[50%] top-[50%] z-50 max-w-md w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] p-5 bg-surface-base border border-border-base rounded-xl shadow-2xl animate-scale-in">
          <KobalteDialog.Title class="text-base font-semibold text-text-base mb-4">Editor Settings</KobalteDialog.Title>

          <div class="space-y-4 text-xs text-text-base">
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">Font Size</div>
                <div class="text-text-muted text-[11px]">Editor font size in pixels</div>
              </div>
              <input
                type="number"
                min="10"
                max="32"
                value={buffer.settings.fontSize}
                onInput={(e) => buffer.setSettings({ fontSize: Number(e.currentTarget.value) || 13 })}
                class="w-16 px-2 py-1 bg-surface-raised border border-border-base rounded text-right"
              />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">Tab Size</div>
                <div class="text-text-muted text-[11px]">Number of spaces per indentation</div>
              </div>
              <input
                type="number"
                min="1"
                max="8"
                value={buffer.settings.tabSize}
                onInput={(e) => buffer.setSettings({ tabSize: Number(e.currentTarget.value) || 2 })}
                class="w-16 px-2 py-1 bg-surface-raised border border-border-base rounded text-right"
              />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">Minimap</div>
                <div class="text-text-muted text-[11px]">Show code overview scrollbar</div>
              </div>
              <input
                type="checkbox"
                checked={buffer.settings.minimap}
                onChange={(e) => buffer.setSettings({ minimap: e.currentTarget.checked })}
                class="rounded"
              />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">Word Wrap</div>
                <div class="text-text-muted text-[11px]">Wrap long lines within editor width</div>
              </div>
              <select
                value={buffer.settings.wordWrap}
                onChange={(e) => buffer.setSettings({ wordWrap: e.currentTarget.value as any })}
                class="px-2 py-1 bg-surface-raised border border-border-base rounded"
              >
                <option value="on">On</option>
                <option value="off">Off</option>
                <option value="wordWrapColumn">Column</option>
                <option value="bounded">Bounded</option>
              </select>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">Code Folding</div>
                <div class="text-text-muted text-[11px]">Enable folding regions in gutter</div>
              </div>
              <input
                type="checkbox"
                checked={buffer.settings.folding}
                onChange={(e) => buffer.setSettings({ folding: e.currentTarget.checked })}
                class="rounded"
              />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">Bracket Pair Colorization</div>
                <div class="text-text-muted text-[11px]">Colorize matching brackets and pairs</div>
              </div>
              <input
                type="checkbox"
                checked={buffer.settings.bracketPairColorization}
                onChange={(e) => buffer.setSettings({ bracketPairColorization: e.currentTarget.checked })}
                class="rounded"
              />
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => props.onOpenChange(false)}
              class="px-3 py-1.5 bg-surface-raised hover:bg-surface-hover border border-border-base rounded-md text-xs font-medium"
            >
              Done
            </button>
          </div>
        </KobalteDialog.Content>
      </KobalteDialog.Portal>
    </KobalteDialog>
  )
}
