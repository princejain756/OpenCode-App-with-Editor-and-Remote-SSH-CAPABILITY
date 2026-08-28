import { batch, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { useSDK } from "./sdk"
import { useServerSDK } from "./server-sdk"
import { showToast } from "@/utils/toast"

export interface SSHHost {
  id: string
  host: string
  hostName: string
  label?: string
  user?: string
  port?: number
  identityFile?: string[]
  proxyJump?: string
  forwardAgent?: boolean
  source: "config" | "custom"
  lastConnected?: number
  defaultDirectory?: string
}

export interface SSHActiveConnection {
  hostId: string
  host: string
  hostName: string
  user: string
  port: number
  localPort: number
  status: "connecting" | "connected" | "disconnected" | "error"
  connectedAt?: number
  remoteOS?: string
  error?: string
}

export const { use: useSSH, provider: SSHProvider } = createSimpleContext({
  name: "SSH",
  gate: false,
  init: () => {
    const sdk = useSDK()
    const serverSDK = useServerSDK()

    const [hosts, setHosts] = createStore<SSHHost[]>([])
    const [activeConnections, setActiveConnections] = createStore<Record<string, SSHActiveConnection>>({})
    const [isLoading, setIsLoading] = createSignal(false)
    const [connectingHostId, setConnectingHostId] = createSignal<string | undefined>(undefined)

    const fetchHosts = async () => {
      try {
        setIsLoading(true)
        const client = serverSDK().client as any
        let list: SSHHost[] = []

        if (client.ssh?.hosts) {
          const res = await client.ssh.hosts()
          list = res.data ?? []
        } else {
          const url = `${serverSDK().url}/ssh/hosts`
          const res = await fetch(url)
          if (res.ok) list = await res.json()
        }

        setHosts(reconcile(list))
      } catch (err) {
        console.error("[ssh] Failed to fetch hosts", err)
      } finally {
        setIsLoading(false)
      }
    }

    const fetchStatus = async () => {
      try {
        const client = serverSDK().client as any
        let statusData: { activeConnections: SSHActiveConnection[] } | undefined

        if (client.ssh?.status) {
          const res = await client.ssh.status()
          statusData = res.data
        } else {
          const url = `${serverSDK().url}/ssh/status`
          const res = await fetch(url)
          if (res.ok) statusData = await res.json()
        }

        if (statusData?.activeConnections) {
          const map: Record<string, SSHActiveConnection> = {}
          for (const conn of statusData.activeConnections) {
            map[conn.hostId] = conn
          }
          setActiveConnections(reconcile(map))
        }
      } catch (err) {
        console.error("[ssh] Failed to fetch SSH status", err)
      }
    }

    createEffect(() => {
      const dir = sdk().directory
      if (dir) {
        void fetchHosts()
        void fetchStatus()
      }
    })

    const saveHost = async (hostData: Omit<SSHHost, "source">) => {
      try {
        const client = serverSDK().client as any
        let saved: SSHHost | undefined

        if (client.ssh?.saveHost) {
          const res = await client.ssh.saveHost(hostData)
          saved = res.data
        } else {
          const url = `${serverSDK().url}/ssh/hosts`
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(hostData),
          })
          if (res.ok) saved = await res.json()
        }

        if (saved) {
          showToast({
            variant: "success",
            title: "SSH Host Saved",
            description: `Saved configuration for ${saved.host}.`,
          })
          void fetchHosts()
        }
        return saved
      } catch (err) {
        showToast({
          variant: "error",
          title: "Save Failed",
          description: err instanceof Error ? err.message : String(err),
        })
        return undefined
      }
    }

    const removeHost = async (hostId: string) => {
      try {
        const client = serverSDK().client as any
        if (client.ssh?.removeHost) {
          await client.ssh.removeHost({ id: hostId })
        } else {
          const url = `${serverSDK().url}/ssh/hosts/${hostId}`
          await fetch(url, { method: "DELETE" })
        }

        showToast({
          variant: "success",
          title: "SSH Host Removed",
          description: "Host was removed from your saved list.",
        })
        void fetchHosts()
        return true
      } catch (err) {
        showToast({
          variant: "error",
          title: "Remove Failed",
          description: err instanceof Error ? err.message : String(err),
        })
        return false
      }
    }

    const connect = async (hostId: string, password?: string, passphrase?: string) => {
      setConnectingHostId(hostId)
      try {
        const client = serverSDK().client as any
        let connection: SSHActiveConnection | undefined

        if (client.ssh?.connect) {
          const res = await client.ssh.connect({ hostId, password, passphrase })
          connection = res.data
        } else {
          const url = `${serverSDK().url}/ssh/connect`
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hostId, password, passphrase }),
          })
          if (res.ok) connection = await res.json()
        }

        if (connection) {
          setActiveConnections(connection.hostId, connection)
          showToast({
            variant: "success",
            title: "SSH Connected",
            description: `Connected to ${connection.user}@${connection.hostName} (Tunnel port ${connection.localPort}).`,
          })
          void fetchHosts()
        }
        return connection
      } catch (err) {
        showToast({
          variant: "error",
          title: "Connection Failed",
          description: err instanceof Error ? err.message : String(err),
        })
        return undefined
      } finally {
        setConnectingHostId(undefined)
      }
    }

    const disconnect = async (hostId: string) => {
      try {
        const client = serverSDK().client as any
        if (client.ssh?.disconnect) {
          await client.ssh.disconnect({ hostId })
        } else {
          const url = `${serverSDK().url}/ssh/disconnect`
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hostId }),
          })
        }

        setActiveConnections(hostId, {
          ...(activeConnections[hostId] || {}),
          status: "disconnected",
        } as SSHActiveConnection)

        showToast({
          variant: "success",
          title: "SSH Disconnected",
          description: "Persistent tunnel has been terminated.",
        })
        return true
      } catch (err) {
        showToast({
          variant: "error",
          title: "Disconnect Failed",
          description: err instanceof Error ? err.message : String(err),
        })
        return false
      }
    }

    const isConnected = (hostId: string) => {
      return activeConnections[hostId]?.status === "connected"
    }

    return {
      hosts,
      activeConnections,
      isLoading,
      connectingHostId,
      fetchHosts,
      fetchStatus,
      saveHost,
      removeHost,
      connect,
      disconnect,
      isConnected,
    }
  },
})
