import { createSignal } from "solid-js"
import { Dialog as KobalteDialog } from "@kobalte/core/dialog"
import { Button } from "@opencode-ai/ui/button"
import { useSSH } from "@/context/ssh"

export interface AddSSHHostDialogProps {
  open: boolean
  onClose: () => void
}

export function AddSSHHostDialog(props: AddSSHHostDialogProps) {
  const ssh = useSSH()

  const [host, setHost] = createSignal("")
  const [hostName, setHostName] = createSignal("")
  const [label, setLabel] = createSignal("")
  const [user, setUser] = createSignal("ubuntu")
  const [port, setPort] = createSignal(22)
  const [identityFile, setIdentityFile] = createSignal("~/.ssh/id_ed25519")
  const [proxyJump, setProxyJump] = createSignal("")
  const [defaultDirectory, setDefaultDirectory] = createSignal("/home/ubuntu/project")

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!host().trim() || !hostName().trim()) return

    const id = `custom-ssh-${host().trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`

    await ssh.saveHost({
      id,
      host: host().trim(),
      hostName: hostName().trim(),
      label: label().trim() || undefined,
      user: user().trim() || undefined,
      port: port() || 22,
      identityFile: identityFile().trim() ? [identityFile().trim()] : undefined,
      proxyJump: proxyJump().trim() || undefined,
      defaultDirectory: defaultDirectory().trim() || undefined,
    })

    props.onClose()
  }

  return (
    <KobalteDialog open={props.open} onOpenChange={(open: boolean) => !open && props.onClose()}>
      <KobalteDialog.Portal>
        <KobalteDialog.Overlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <KobalteDialog.Content class="fixed left-[50%] top-[50%] z-50 max-w-md w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] p-5 bg-surface-base border border-border-base rounded-xl shadow-2xl animate-scale-in">
          <KobalteDialog.Title class="text-base font-semibold text-text-base mb-4">
            Add Remote SSH Host
          </KobalteDialog.Title>

          <form onSubmit={handleSubmit} class="space-y-3 text-xs text-text-base">
            <div>
              <label class="block font-medium mb-1">Host Alias / Connection Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. dev-box or prod-ubuntu"
                value={host()}
                onInput={(e) => {
                  setHost(e.currentTarget.value)
                  if (!hostName()) setHostName(e.currentTarget.value)
                }}
                class="w-full px-2.5 py-1.5 bg-surface-raised border border-border-base rounded text-xs text-text-base focus:outline-none focus:border-border-strong"
              />
            </div>

            <div class="grid grid-cols-3 gap-2">
              <div class="col-span-2">
                <label class="block font-medium mb-1">HostName / IP Address *</label>
                <input
                  type="text"
                  required
                  placeholder="192.168.1.100 or ec2.compute.aws"
                  value={hostName()}
                  onInput={(e) => setHostName(e.currentTarget.value)}
                  class="w-full px-2.5 py-1.5 bg-surface-raised border border-border-base rounded text-xs text-text-base focus:outline-none focus:border-border-strong"
                />
              </div>
              <div>
                <label class="block font-medium mb-1">Port</label>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={port()}
                  onInput={(e) => setPort(Number(e.currentTarget.value) || 22)}
                  class="w-full px-2.5 py-1.5 bg-surface-raised border border-border-base rounded text-xs text-text-base focus:outline-none focus:border-border-strong text-right"
                />
              </div>
            </div>

            <div>
              <label class="block font-medium mb-1">User</label>
              <input
                type="text"
                placeholder="e.g. ubuntu, root, ec2-user"
                value={user()}
                onInput={(e) => setUser(e.currentTarget.value)}
                class="w-full px-2.5 py-1.5 bg-surface-raised border border-border-base rounded text-xs text-text-base focus:outline-none focus:border-border-strong"
              />
            </div>

            <div>
              <label class="block font-medium mb-1">Identity File (Private Key Path)</label>
              <input
                type="text"
                placeholder="~/.ssh/id_ed25519 or ~/.ssh/id_rsa"
                value={identityFile()}
                onInput={(e) => setIdentityFile(e.currentTarget.value)}
                class="w-full px-2.5 py-1.5 bg-surface-raised border border-border-base rounded text-xs text-text-base focus:outline-none focus:border-border-strong font-mono text-[11px]"
              />
            </div>

            <div>
              <label class="block font-medium mb-1">Remote Default Directory</label>
              <input
                type="text"
                placeholder="/home/ubuntu/project"
                value={defaultDirectory()}
                onInput={(e) => setDefaultDirectory(e.currentTarget.value)}
                class="w-full px-2.5 py-1.5 bg-surface-raised border border-border-base rounded text-xs text-text-base focus:outline-none focus:border-border-strong font-mono text-[11px]"
              />
            </div>

            <div>
              <label class="block font-medium mb-1">ProxyJump (Optional)</label>
              <input
                type="text"
                placeholder="e.g. bastion.example.com:22"
                value={proxyJump()}
                onInput={(e) => setProxyJump(e.currentTarget.value)}
                class="w-full px-2.5 py-1.5 bg-surface-raised border border-border-base rounded text-xs text-text-base focus:outline-none focus:border-border-strong font-mono text-[11px]"
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-3">
              <Button size="small" variant="ghost" onClick={props.onClose}>
                Cancel
              </Button>
              <Button size="small" variant="primary" type="submit">
                Save & Connect
              </Button>
            </div>
          </form>
        </KobalteDialog.Content>
      </KobalteDialog.Portal>
    </KobalteDialog>
  )
}
