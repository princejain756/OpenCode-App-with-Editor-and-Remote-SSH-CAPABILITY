import { createSignal } from "solid-js"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { useBuffer } from "./buffer"
import { useServerSDK } from "./server-sdk"
import { showToast } from "@/utils/toast"

export interface RewindOptions {
  sessionID: string
  messageID: string
  partID?: string
  force?: boolean
}

export const { use: useTimelineSync, provider: TimelineSyncProvider } = createSimpleContext({
  name: "TimelineSync",
  gate: false,
  init: () => {
    const buffer = useBuffer()
    const serverSDK = useServerSDK()

    const [isReverting, setIsReverting] = createSignal(false)
    const [isForking, setIsForking] = createSignal(false)
    const [pendingConflictDialog, setPendingConflictDialog] = createSignal<RewindOptions | undefined>(undefined)

    const rewindToCheckpoint = async (opts: RewindOptions) => {
      // Safety check: dirty buffer protection
      if (!opts.force && buffer.dirtyBuffers().length > 0) {
        setPendingConflictDialog(opts)
        return false
      }

      setIsReverting(true)
      try {
        const client = serverSDK().client as any
        if (client.session?.revert) {
          await client.session.revert({
            sessionID: opts.sessionID,
            messageID: opts.messageID,
            partID: opts.partID,
          })
        } else {
          const url = `${serverSDK().url}/session/${opts.sessionID}/revert`
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messageID: opts.messageID,
              partID: opts.partID,
            }),
          })
        }

        // Synchronize all open editor buffers with new disk state
        const openTabs = buffer.openFiles()
        for (const tab of openTabs) {
          await buffer.loadBuffer(tab, { force: true })
        }

        showToast({
          variant: "success",
          title: "Timeline Rewound",
          description: "Workspace and editor state successfully synchronized to checkpoint.",
        })
        return true
      } catch (err) {
        showToast({
          variant: "error",
          title: "Rewind Failed",
          description: err instanceof Error ? err.message : String(err),
        })
        return false
      } finally {
        setIsReverting(false)
        setPendingConflictDialog(undefined)
      }
    }

    const unrevertSession = async (sessionID: string) => {
      setIsReverting(true)
      try {
        const client = serverSDK().client as any
        if (client.session?.unrevert) {
          await client.session.unrevert({ sessionID })
        } else {
          const url = `${serverSDK().url}/session/${sessionID}/unrevert`
          await fetch(url, { method: "POST" })
        }

        // Reload open buffers
        for (const tab of buffer.openFiles()) {
          await buffer.loadBuffer(tab, { force: true })
        }

        showToast({
          variant: "success",
          title: "Timeline Restored",
          description: "Redo/unrevert complete. Returned to latest timeline head.",
        })
      } catch (err) {
        showToast({
          variant: "error",
          title: "Unrevert Failed",
          description: err instanceof Error ? err.message : String(err),
        })
      } finally {
        setIsReverting(false)
      }
    }

    const forkSession = async (sessionID: string, messageID?: string) => {
      setIsForking(true)
      try {
        const client = serverSDK().client as any
        let forkedSession: any
        if (client.session?.fork) {
          const res = await client.session.fork({ sessionID, messageID })
          forkedSession = res.data
        } else {
          const url = `${serverSDK().url}/session/${sessionID}/fork`
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageID }),
          })
          if (res.ok) forkedSession = await res.json()
        }

        showToast({
          variant: "success",
          title: "Session Forked",
          description: `Created new timeline branch "${forkedSession?.title ?? "Forked Session"}".`,
        })
        return forkedSession
      } catch (err) {
        showToast({
          variant: "error",
          title: "Fork Failed",
          description: err instanceof Error ? err.message : String(err),
        })
        return undefined
      } finally {
        setIsForking(false)
      }
    }

    return {
      isReverting,
      isForking,
      pendingConflictDialog,
      setPendingConflictDialog,
      rewindToCheckpoint,
      unrevertSession,
      forkSession,
    }
  },
})
