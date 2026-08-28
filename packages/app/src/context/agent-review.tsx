import { batch, createMemo, createSignal, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { useBuffer } from "./buffer"
import { useSDK } from "./sdk"
import { useServerSDK } from "./server-sdk"

export interface AgentFileChange {
  path: string
  originalContent: string
  proposedContent: string
  status: "pending" | "accepted" | "rejected"
  timestamp: number
  additions: number
  deletions: number
}

function calculateDiffStats(originalText: string, newText: string): { additions: number; deletions: number } {
  const origLines = originalText.split("\n")
  const newLines = newText.split("\n")
  const additions = Math.max(0, newLines.length - origLines.length)
  const deletions = Math.max(0, origLines.length - newLines.length)
  return { additions, deletions }
}

export const { use: useAgentReview, provider: AgentReviewProvider } = createSimpleContext({
  name: "AgentReview",
  gate: false,
  init: () => {
    const buffer = useBuffer()
    const sdk = useSDK()
    const serverSDK = useServerSDK()

    const [changes, setChanges] = createStore<Record<string, AgentFileChange>>({})
    const [selectedFileForReview, setSelectedFileForReview] = createSignal<string | undefined>(undefined)

    // Listen for agent tool execution events or file updates
    const unsub = serverSDK().event.on(sdk().directory, (event: any) => {
      if (
        event.type === "session.tool.executed" ||
        event.type === "tool.executed" ||
        event.type === "agent.file.modified"
      ) {
        const payload = event.properties ?? event.data
        if (payload?.path && payload?.content) {
          recordChange(payload.path, payload.original ?? "", payload.content)
        }
      }
    })
    onCleanup(unsub)

    const recordChange = (filePath: string, original: string, proposed: string) => {
      const stats = calculateDiffStats(original, proposed)
      setChanges(filePath, {
        path: filePath,
        originalContent: original,
        proposedContent: proposed,
        status: "pending",
        timestamp: Date.now(),
        additions: stats.additions,
        deletions: stats.deletions,
      })
    }

    const pendingFiles = createMemo(() => {
      return Object.values(changes).filter((c) => c.status === "pending")
    })

    const pendingCount = createMemo(() => pendingFiles().length)

    const acceptFile = async (filePath: string) => {
      const change = changes[filePath]
      if (!change) return

      // Write proposed content to buffer and save to disk
      buffer.updateContent(filePath, change.proposedContent)
      await buffer.save(filePath)

      setChanges(filePath, "status", "accepted")
    }

    const rejectFile = async (filePath: string) => {
      const change = changes[filePath]
      if (!change) return

      // Revert buffer to original content and save to disk
      buffer.updateContent(filePath, change.originalContent)
      await buffer.save(filePath)

      setChanges(filePath, "status", "rejected")
    }

    const acceptAll = async () => {
      const pending = pendingFiles()
      for (const item of pending) {
        await acceptFile(item.path)
      }
    }

    const rejectAll = async () => {
      const pending = pendingFiles()
      for (const item of pending) {
        await rejectFile(item.path)
      }
    }

    const clearReviewState = () => {
      setChanges(reconcile({}))
      setSelectedFileForReview(undefined)
    }

    return {
      changes,
      pendingFiles,
      pendingCount,
      selectedFileForReview,
      setSelectedFileForReview,
      recordChange,
      acceptFile,
      rejectFile,
      acceptAll,
      rejectAll,
      clearReviewState,
    }
  },
})
