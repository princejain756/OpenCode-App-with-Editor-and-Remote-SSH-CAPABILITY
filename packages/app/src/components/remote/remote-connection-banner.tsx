import { createMemo, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { Button } from "@opencode-ai/ui/button"
import { useServer, ServerConnection } from "@/context/server"
import { useSSH } from "@/context/ssh"

export function RemoteConnectionBanner() {
  const server = useServer()
  const ssh = useSSH()

  const isRemoteSSH = createMemo(() => {
    return server.key.startsWith("ssh:")
  })

  const currentHostId = createMemo(() => {
    if (!isRemoteSSH()) return undefined
    return server.key.replace(/^ssh:/, "")
  })

  const currentHost = createMemo(() => {
    const id = currentHostId()
    if (!id) return undefined
    return ssh.hosts.find((h) => h.id === id || h.host === id)
  })

  const connection = createMemo(() => {
    const id = currentHostId()
    if (!id) return undefined
    return ssh.activeConnections[id]
  })

  const handleDisconnect = async () => {
    const id = currentHostId()
    if (id) {
      await ssh.disconnect(id)
      server.setActive(ServerConnection.Key.make("local"))
    }
  }

  return (
    <Show when={isRemoteSSH()}>
      <div class="flex items-center justify-between px-3 py-1 bg-sky-950/40 border-b border-sky-800/40 text-xs text-sky-200 select-none">
        <div class="flex items-center gap-2">
          <span class="size-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <span class="font-medium">
            Remote SSH: {currentHost()?.user ?? "ubuntu"}@{currentHost()?.hostName ?? currentHost()?.host ?? currentHostId()}
          </span>
          <Show when={connection()?.localPort}>
            <span class="text-[10px] text-sky-400/80 font-mono">
              (Port {connection()!.localPort})
            </span>
          </Show>
          <Show when={connection()?.remoteOS}>
            <span class="px-1.5 py-0.2 rounded bg-sky-900/50 text-[10px] text-sky-300">
              {connection()!.remoteOS}
            </span>
          </Show>
        </div>

        <div class="flex items-center gap-2">
          <Button
            size="small"
            variant="ghost"
            onClick={() => server.setActive(ServerConnection.Key.make("local"))}
            class="h-5 px-2 text-[10px] text-sky-300 hover:text-sky-100"
          >
            Switch to Local
          </Button>
          <Button
            size="small"
            variant="ghost"
            onClick={handleDisconnect}
            class="h-5 px-2 text-[10px] text-rose-400 hover:text-rose-300"
          >
            Disconnect
          </Button>
        </div>
      </div>
    </Show>
  )
}
