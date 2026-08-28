import { createSignal, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Button } from "@opencode-ai/ui/button"
import { useSSH, type SSHHost } from "@/context/ssh"
import { AddSSHHostDialog } from "./add-ssh-host-dialog"

export function RemoteExplorer(props: { onClose?: () => void }) {
  const ssh = useSSH()
  const [showAddDialog, setShowAddDialog] = createSignal(false)
  const [quickConnectInput, setQuickConnectInput] = createSignal("")

  const handleQuickConnect = async (e: Event) => {
    e.preventDefault()
    const input = quickConnectInput().trim()
    if (!input) return

    // Parse "ssh [user@]host [-p port]"
    const clean = input.replace(/^ssh\s+/, "")
    const parts = clean.split(/\s+/)
    let userHost = parts[0]
    let port = 22

    for (let i = 1; i < parts.length; i++) {
      if (parts[i] === "-p" && parts[i + 1]) {
        port = parseInt(parts[i + 1], 10) || 22
      }
    }

    let user = "ubuntu"
    let hostName = userHost
    if (userHost.includes("@")) {
      const atIdx = userHost.indexOf("@")
      user = userHost.slice(0, atIdx)
      hostName = userHost.slice(atIdx + 1)
    }

    const hostId = `quick-${hostName.replace(/[^a-z0-9_-]/gi, "_")}`
    await ssh.saveHost({
      id: hostId,
      host: hostName,
      hostName,
      user,
      port,
    })

    await ssh.connect(hostId)
    setQuickConnectInput("")
  }

  return (
    <div class="flex flex-col h-full w-full bg-surface-base border-r border-border-base select-none">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-2 border-b border-border-base bg-surface-raised/50">
        <div class="flex items-center gap-2">
          <Icon name="folder" class="size-4 text-text-muted" />
          <span class="text-xs font-semibold text-text-strong uppercase tracking-wider">Remote Explorer</span>
        </div>
        <div class="flex items-center gap-1">
          <IconButton
            icon="plus"
            variant="ghost"
            class="size-5"
            onClick={() => setShowAddDialog(true)}
            title="Add SSH Host..."
          />
          <Show when={props.onClose}>
            <IconButton icon="close-small" variant="ghost" class="size-5" onClick={props.onClose} />
          </Show>
        </div>
      </div>

      {/* Quick Connect Row */}
      <div class="p-3 border-b border-border-base bg-surface-raised/20">
        <form onSubmit={handleQuickConnect} class="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="ssh user@hostname -p 22"
            value={quickConnectInput()}
            onInput={(e) => setQuickConnectInput(e.currentTarget.value)}
            class="flex-1 px-2.5 py-1 bg-surface-raised border border-border-base rounded text-[11px] font-mono text-text-base focus:outline-none focus:border-border-strong placeholder:text-text-faint"
          />
          <Button
            size="small"
            variant="secondary"
            type="submit"
            disabled={!quickConnectInput().trim()}
            class="h-7 px-2 text-xs shrink-0"
          >
            Connect
          </Button>
        </form>
      </div>

      {/* SSH Targets Section */}
      <div class="px-3 py-1.5 border-b border-border-base bg-surface-raised/40 flex items-center justify-between text-[11px] font-medium text-text-muted">
        <span>SSH TARGETS ({ssh.hosts.length})</span>
        <button
          type="button"
          onClick={() => void ssh.fetchHosts()}
          class="hover:text-text-base text-[10px]"
        >
          Refresh
        </button>
      </div>

      {/* Hosts List */}
      <div class="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1">
        <Show when={ssh.hosts.length === 0 && !ssh.isLoading()}>
          <div class="px-3 py-8 text-center text-text-muted text-xs">
            <p class="mb-2">No SSH hosts configured.</p>
            <Button size="small" variant="secondary" onClick={() => setShowAddDialog(true)}>
              + Add SSH Host
            </Button>
          </div>
        </Show>

        <For each={ssh.hosts}>
          {(host) => {
            const isConnecting = () => ssh.connectingHostId() === host.id
            const conn = () => ssh.activeConnections[host.id]
            const isConn = () => conn()?.status === "connected"

            return (
              <div class="p-2 rounded bg-surface-raised/40 hover:bg-surface-raised border border-border-base/60 transition-colors group">
                <div class="flex items-center justify-between mb-1">
                  <div class="flex items-center gap-2 truncate">
                    <span
                      class={`size-2 rounded-full shrink-0 ${
                        isConn()
                          ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                          : isConnecting()
                          ? "bg-amber-500 animate-pulse"
                          : "bg-text-faint/40"
                      }`}
                    />
                    <span class="font-medium text-xs text-text-strong truncate">
                      {host.label ?? host.host}
                    </span>
                    <Show when={host.source === "config"}>
                      <span class="px-1 py-0.2 bg-surface-base text-[9px] font-mono text-text-muted rounded border border-border-base">
                        config
                      </span>
                    </Show>
                  </div>

                  <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <Show
                      when={isConn()}
                      fallback={
                        <Button
                          size="small"
                          variant="secondary"
                          disabled={isConnecting()}
                          onClick={() => void ssh.connect(host.id)}
                          class="h-5 px-2 text-[10px]"
                        >
                          {isConnecting() ? "Connecting..." : "Connect"}
                        </Button>
                      }
                    >
                      <Button
                        size="small"
                        variant="ghost"
                        onClick={() => void ssh.disconnect(host.id)}
                        class="h-5 px-2 text-[10px] text-rose-400 hover:text-rose-300"
                      >
                        Disconnect
                      </Button>
                    </Show>

                    <Show when={host.source === "custom"}>
                      <button
                        type="button"
                        onClick={() => void ssh.removeHost(host.id)}
                        class="p-1 text-text-faint hover:text-rose-400"
                        title="Remove Host"
                      >
                        <Icon name="close-small" class="size-3" />
                      </button>
                    </Show>
                  </div>
                </div>

                <div class="pl-4 text-[11px] text-text-muted font-mono space-y-0.5">
                  <div class="truncate">
                    {host.user ?? "ubuntu"}@{host.hostName ?? host.host}:{host.port ?? 22}
                  </div>
                  <Show when={conn()?.localPort}>
                    <div class="text-[10px] text-emerald-400">
                      Tunnel active on localhost:{conn()!.localPort}
                    </div>
                  </Show>
                  <Show when={host.defaultDirectory}>
                    <div class="text-[10px] text-text-faint truncate">
                      Path: {host.defaultDirectory}
                    </div>
                  </Show>
                </div>
              </div>
            )
          }}
        </For>
      </div>

      <AddSSHHostDialog
        open={showAddDialog()}
        onClose={() => setShowAddDialog(false)}
      />
    </div>
  )
}
