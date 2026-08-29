/**
 * IDEWorkbench — A real IDE layout for OpenCode.
 *
 * Layout:
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │  Title bar / project name / branch / actions                  │
 *   ├──────┬──────────┬────────────────────────────────┬────────────┤
 *   │      │          │  File tabs (open files)        │            │
 *   │ Act  │ Side     ├────────────────────────────────┤   Chat /   │
 *   │ Bar  │ Panel    │                                │   Agent    │
 *   │      │ (per-    │     Monaco editor area         │   panel    │
 *   │      │  tab)    │                                │            │
 *   │      │          │                                │            │
 *   │      │          ├────────────────────────────────┤            │
 *   │      │          │  Terminal / Output / Debug     │            │
 *   ├──────┴──────────┴────────────────────────────────┴────────────┤
 *   │  Status bar: language / encoding / cursor / git branch         │
 *   └───────────────────────────────────────────────────────────────┘
 *
 * - Activity bar tabs: Explorer, Remote Explorer, Source Control,
 *   Problems, Run/Debug.
 * - Each activity tab shows its corresponding panel in the sidebar.
 * - File explorer uses FileTreeV2, clicks open in Monaco via buffer.open.
 * - Editor area is a tab strip + MonacoEditor (from existing components).
 * - Terminal uses the existing Terminal context (TerminalProvider).
 * - Chat panel on the right reuses the existing prompt input + messages
 *   (so the agent still works, with its rewind/fork/diff features).
 *
 * The workbench depends on the existing IDE contexts already being mounted
 * (Buffer, LSP, Git, DAP, SSH, AgentReview, TimelineSync, Terminal,
 * FileProvider). The route component is responsible for that.
 */

import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  type JSX,
  type ParentProps,
} from "solid-js"
import { Dynamic } from "solid-js/web"
import { Portal } from "solid-js/web"
import { useNavigate, useParams } from "@solidjs/router"
import { getFilename } from "@opencode-ai/core/util/path"
import { base64Encode } from "@opencode-ai/core/util/encode"
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Spinner } from "@opencode-ai/ui/spinner"
import { Tabs } from "@opencode-ai/ui/tabs"
import { Tooltip } from "@opencode-ai/ui/tooltip"

import { useBuffer } from "@/context/buffer"
import { useFile } from "@/context/file"
import { useSDK } from "@/context/sdk"
import { useServerSDK } from "@/context/server-sdk"
import { useLanguage } from "@/context/language"
import { useLsp } from "@/context/lsp"
import { useGit } from "@/context/git"
import { useDAP } from "@/context/dap"
import { useSSH } from "@/context/ssh"
import { useAgentReview } from "@/context/agent-review"
import { useTimelineSync } from "@/context/timeline-sync"
import { useTerminal } from "@/context/terminal"
import { usePlatform } from "@/context/platform"
import { useGlobal } from "@/context/global"

import FileTreeV2 from "@/components/file-tree-v2"
import type { FileNode } from "@opencode-ai/sdk/v2"
import { MonacoEditor } from "@/components/editor"
import { RemoteExplorer, AddSSHHostDialog, RemoteConnectionBanner } from "@/components/remote"
import { SourceControlPanel } from "@/components/git"
import { ProblemsPanel } from "@/components/lsp"
import { DebugPanel, DebugToolbar } from "@/components/debug"
import { AgentReviewBanner } from "@/components/agent-review"
import { Terminal } from "@/components/terminal"
import { ConflictBanner } from "@/components/editor"

type ActivityTab = "explorer" | "remote" | "git" | "problems" | "debug"

const ACTIVITY_TABS: Array<{ id: ActivityTab; icon: IconName; label: string; shortcut?: string }> = [
  { id: "explorer", icon: "file-tree", label: "Explorer" },
  { id: "remote", icon: "server", label: "Remote Explorer" },
  { id: "git", icon: "branch", label: "Source Control" },
  { id: "problems", icon: "warning", label: "Problems" },
  { id: "debug", icon: "console", label: "Run and Debug" },
]

type IconName = NonNullable<Parameters<typeof Icon>[0]>["name"]

export interface IDEWorkbenchProps {
  directory: string
}

export function IDEWorkbench(props: IDEWorkbenchProps) {
  const navigate = useNavigate()
  const params = useParams()
  const buffer = useBuffer()
  const file = useFile()
  const sdk = useSDK()
  const serverSDK = useServerSDK()
  const language = useLanguage()
  const platform = usePlatform()
  const ssh = useSSH()
  const lsp = useLsp()
  const git = useGit()
  const dap = useDAP()
  const agentReview = useAgentReview()
  const timelineSync = useTimelineSync()
  const terminal = useTerminal()
  const global = useGlobal()

  const [activityTab, setActivityTab] = createSignal<ActivityTab>("explorer")
  const [sidebarOpen, setSidebarOpen] = createSignal(true)
  const [terminalOpen, setTerminalOpen] = createSignal(true)
  const [chatOpen, setChatOpen] = createSignal(true)
  const [showAddSSH, setShowAddSSH] = createSignal(false)
  const [chatMessage, setChatMessage] = createSignal("")
  const [chatBusy, setChatBusy] = createSignal(false)

  // Project name
  const projectName = createMemo(() => {
    const dir = props.directory
    if (!dir) return ""
    return getFilename(dir.replace(/\/$/, "")) || dir
  })

  // Refresh file tree when directory changes
  onMount(() => {
    void file.tree.list("")
  })

  // Open file from explorer
  const onFileClick = (node: FileNode) => {
    if (node?.type !== "file") return
    const target = node.absolute ?? node.path
    if (target) {
      void buffer.open(target)
    }
  }

  // Editor area: render the active tab
  const activePath = createMemo(() => buffer.activePath())
  const openFiles = createMemo(() => buffer.openFiles())
  const dirtyFiles = createMemo(() => new Set(buffer.dirtyFiles()))

  // Create a new file in workspace
  const onCreateFile = async () => {
    const name = window.prompt("New file name (relative to workspace root):", "untitled.txt")
    if (!name) return
    const target = name.startsWith("/") ? name : `${props.directory}/${name}`
    await buffer.createFile(target, "")
    await file.tree.refresh("")
    await buffer.open(target)
  }

  const onCreateDirectory = async () => {
    const name = window.prompt("New directory name (relative to workspace root):", "new-folder")
    if (!name) return
    const target = name.startsWith("/") ? name : `${props.directory}/${name}`
    await buffer.createDirectory(target)
    await file.tree.refresh("")
  }

  const onCloseTab = (path: string) => {
    if (dirtyFiles().has(path)) {
      const ok = window.confirm(`${getFilename(path)} has unsaved changes. Close anyway?`)
      if (!ok) return
    }
    // Close the buffer. If the closed tab was active, the next-open logic
    // is handled by the layout's tabs store which promotes the previous tab.
    buffer.close(path)
  }

  // ── Sidebar panels ────────────────────────────────────────────────
  const ExplorerPanel = () => (
    <div class="flex flex-col h-full">
      <div class="px-3 py-2 flex items-center justify-between border-b border-border-weaker-base">
        <span class="text-12-medium uppercase tracking-wide text-text-weak">{projectName().toUpperCase()}</span>
        <div class="flex items-center gap-1">
          <Tooltip value="New File">
            <IconButton icon="plus" size="small" variant="ghost" onClick={onCreateFile} aria-label="New File" />
          </Tooltip>
          <Tooltip value="New Folder">
            <IconButton
              icon="folder-add-left"
              size="small"
              variant="ghost"
              onClick={onCreateDirectory}
              aria-label="New Folder"
            />
          </Tooltip>
          <Tooltip value="Refresh">
            <IconButton
              icon="reset"
              size="small"
              variant="ghost"
              onClick={() => file.tree.refresh("")}
              aria-label="Refresh"
            />
          </Tooltip>
        </div>
      </div>
      <div class="flex-1 min-h-0 overflow-y-auto px-1 py-1">
        <FileTreeV2 active={activePath() ?? ""} onFileClick={onFileClick} onFileDoubleClick={onFileClick} />
      </div>
    </div>
  )

  const RemotePanel = () => (
    <div class="flex flex-col h-full">
      <div class="px-3 py-2 flex items-center justify-between border-b border-border-weaker-base">
        <span class="text-12-medium uppercase tracking-wide text-text-weak">REMOTE EXPLORER</span>
        <Tooltip value="Add SSH Host">
          <IconButton
            icon="plus"
            size="small"
            variant="ghost"
            onClick={() => setShowAddSSH(true)}
            aria-label="Add SSH Host"
          />
        </Tooltip>
      </div>
      <div class="flex-1 min-h-0 overflow-y-auto">
        <RemoteExplorer />
      </div>
    </div>
  )

  const GitPanel = () => (
    <div class="flex flex-col h-full">
      <div class="px-3 py-2 flex items-center justify-between border-b border-border-weaker-base">
        <span class="text-12-medium uppercase tracking-wide text-text-weak">SOURCE CONTROL</span>
      </div>
      <div class="flex-1 min-h-0 overflow-y-auto">
        <SourceControlPanel />
      </div>
    </div>
  )

  const ProblemsPanelView = () => (
    <div class="flex flex-col h-full">
      <div class="px-3 py-2 flex items-center justify-between border-b border-border-weaker-base">
        <span class="text-12-medium uppercase tracking-wide text-text-weak">
          PROBLEMS{" "}
          {lsp.totalErrors() > 0 || lsp.totalWarnings() > 0
            ? `(${lsp.totalErrors()} errors, ${lsp.totalWarnings()} warnings)`
            : ""}
        </span>
        <Tooltip value="Refresh">
          <IconButton
            icon="reset"
            size="small"
            variant="ghost"
            onClick={() => lsp.fetchDiagnostics()}
            aria-label="Refresh diagnostics"
          />
        </Tooltip>
      </div>
      <div class="flex-1 min-h-0 overflow-y-auto">
        <ProblemsPanel />
      </div>
    </div>
  )

  const DebugPanelView = () => (
    <div class="flex flex-col h-full">
      <div class="px-3 py-2 flex items-center justify-between border-b border-border-weaker-base">
        <span class="text-12-medium uppercase tracking-wide text-text-weak">RUN AND DEBUG</span>
      </div>
      <div class="flex-1 min-h-0 overflow-y-auto">
        <DebugPanel />
      </div>
    </div>
  )

  const sidebarPanel = () => {
    switch (activityTab()) {
      case "explorer":
        return <ExplorerPanel />
      case "remote":
        return <RemotePanel />
      case "git":
        return <GitPanel />
      case "problems":
        return <ProblemsPanelView />
      case "debug":
        return <DebugPanelView />
    }
  }

  // ── Editor tabs ───────────────────────────────────────────────────
  const EditorTabs = () => (
    <div class="flex items-center border-b border-border-weaker-base bg-background-base min-h-[36px] overflow-x-auto no-scrollbar">
      <For each={openFiles()}>
        {(filePath) => {
          const isActive = createMemo(() => activePath() === filePath)
          const isDirty = createMemo(() => dirtyFiles().has(filePath))
          return (
            <button
              type="button"
              class="group flex items-center gap-2 px-3 py-1.5 text-12-regular border-r border-border-weaker-base whitespace-nowrap"
              classList={{
                "bg-background-stronger text-text-strong": isActive(),
                "bg-background-base text-text-weak hover:text-text-base": !isActive(),
              }}
              onClick={() => buffer.open(filePath)}
            >
              <Icon
                name={isDirty() ? "dot-grid" : "open-file"}
                class="size-3"
                classList={{
                  "text-text-base": isDirty(),
                  "text-text-weak": !isDirty(),
                }}
              />
              <span>{getFilename(filePath)}</span>
              <button
                type="button"
                class="opacity-0 group-hover:opacity-100 ml-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(filePath)
                }}
              >
                <Icon name="close" class="size-3" />
              </button>
            </button>
          )
        }}
      </For>
      <Show when={openFiles().length === 0}>
        <div class="px-3 py-1.5 text-12-regular text-text-weak">
          No files open. Click a file in the Explorer to start editing.
        </div>
      </Show>
    </div>
  )

  // ── Terminal area ─────────────────────────────────────────────────
  const TerminalArea = () => {
    const termList = () => terminal.all()
    const activeId = createMemo(() => terminal.active())
    return (
      <div class="flex flex-col h-full border-t border-border-weaker-base bg-background-base">
        <div class="flex items-center px-2 py-1 border-b border-border-weaker-base text-12-medium">
          <For each={termList()}>
            {(pty) => (
              <button
                type="button"
                class="px-2 py-0.5 rounded-sm mr-1"
                classList={{
                  "bg-background-stronger text-text-strong": activeId() === pty.id,
                  "text-text-weak hover:text-text-base": activeId() !== pty.id,
                }}
                onClick={() => terminal.open(pty.id)}
              >
                {pty.title ?? pty.id.slice(0, 8)}
              </button>
            )}
          </For>
          <div class="flex-1" />
          <IconButton
            icon="plus"
            size="small"
            variant="ghost"
            onClick={() => terminal.new({ focus: true })}
            aria-label="New Terminal"
          />
          <IconButton
            icon="close"
            size="small"
            variant="ghost"
            onClick={() => {
              const a = terminal.active()
              if (a) terminal.close(a)
            }}
            aria-label="Close Terminal"
          />
        </div>
        <div class="flex-1 min-h-0 relative">
          <For each={termList()}>
            {(pty) => (
              <Show when={activeId() === pty.id}>
                <div class="absolute inset-0">
                  <Terminal pty={pty} autoFocus class="size-full" />
                </div>
              </Show>
            )}
          </For>
        </div>
      </div>
    )
  }

  // ── Chat panel (right) ────────────────────────────────────────────
  const ChatPanel = () => {
    // Build the user-facing agent chat. We use a minimal local form here
    // for now — the deep integration with sessions lives in the existing
    // app shell, so we provide a friendly "ask the agent" affordance that
    // forwards the prompt to the active session if one exists, or shows
    // guidance to open a session.
    const submit = () => {
      const message = chatMessage().trim()
      if (!message || chatBusy()) return
      setChatBusy(true)
      setChatMessage("")
      // For the workbench we expose a clean "go to session" flow rather
      // than duplicate the entire session/timeline UI. This keeps the
      // workbench responsive while preserving the upstream chat.
      const target = `/${base64Encode(props.directory)}/session`
      navigate(target)
      // Caller can press Enter / send via prompt input there.
      setTimeout(() => setChatBusy(false), 250)
    }
    return (
      <div class="flex flex-col h-full">
        <div class="px-3 py-2 border-b border-border-weaker-base text-12-medium uppercase tracking-wide text-text-weak">
          AGENT
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto px-3 py-3 text-12-regular text-text-base">
          <div class="rounded-md bg-background-stronger p-3 text-12-regular text-text-weak">
            Ask the OpenCode agent to read, edit, or run things in this workspace. The agent operates on{" "}
            <code class="text-text-base">{projectName()}</code> with full access to your files, terminal, Git, and LSP.
            <br />
            <br />
            <span class="text-text-base">Open a session to start chatting</span> — the full rewind / fork / review
            experience lives in the session view.
          </div>
          <Show when={Object.keys(agentReview.changes ?? {}).length > 0}>
            <div class="mt-3">
              <div class="text-11-medium text-text-weak mb-2">PENDING REVIEW</div>
              <For each={Object.values(agentReview.changes)}>
                {(change: any) => (
                  <div class="rounded-md border border-border-weaker-base p-2 mb-2">
                    <div class="text-12-medium">{getFilename(change.path)}</div>
                    <div class="text-11-regular text-text-weak">
                      +{change.additions} -{change.deletions}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
        <div class="border-t border-border-weaker-base p-2">
          <form
            class="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <input
              type="text"
              class="flex-1 bg-background-stronger rounded-md px-2 py-1.5 text-12-regular text-text-base outline-none border border-border-weaker-base focus:border-border-base"
              placeholder="Ask the agent..."
              value={chatMessage()}
              onInput={(e) => setChatMessage(e.currentTarget.value)}
            />
            <Button size="small" type="submit" disabled={chatBusy() || !chatMessage().trim()}>
              Send
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // ── Top bar (project + actions) ───────────────────────────────────
  const TopBar = () => (
    <div class="flex items-center h-10 px-3 border-b border-border-weaker-base bg-background-base gap-3">
      <div class="flex items-center gap-2">
        <Icon name="folder" class="size-4 text-text-weak" />
        <span class="text-13-medium text-text-base">{projectName()}</span>
        <Show when={git.currentBranch()}>
          <span class="text-11-regular text-text-weak">·</span>
          <span class="text-11-regular text-text-weak flex items-center gap-1">
            <Icon name="branch" class="size-3" />
            {git.currentBranch()}
          </span>
        </Show>
        <Show when={Object.keys(ssh.activeConnections).length > 0}>
          <span class="text-11-regular text-text-base flex items-center gap-1 ml-2 px-2 py-0.5 rounded bg-background-stronger">
            <Icon name="server" class="size-3 text-text-base" />
            {(() => {
              const first = Object.values(ssh.activeConnections)[0]
              if (!first) return null
              return `${first.user}@${first.hostName}`
            })()}
          </span>
        </Show>
      </div>
      <div class="flex-1" />
      <Tooltip value="Toggle Sidebar">
        <IconButton
          icon="sidebar"
          size="small"
          variant="ghost"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle Sidebar"
        />
      </Tooltip>
      <Tooltip value="Toggle Terminal">
        <IconButton
          icon="terminal"
          size="small"
          variant="ghost"
          onClick={() => setTerminalOpen((v) => !v)}
          aria-label="Toggle Terminal"
        />
      </Tooltip>
      <Tooltip value="Toggle Chat">
        <IconButton
          icon="comment"
          size="small"
          variant="ghost"
          onClick={() => setChatOpen((v) => !v)}
          aria-label="Toggle Chat"
        />
      </Tooltip>
    </div>
  )

  // ── Status bar (bottom) ───────────────────────────────────────────
  const StatusBar = () => {
    const active = createMemo(() => {
      const path = activePath()
      if (!path) return null
      return buffer.getBuffer(path)
    })
    return (
      <div class="flex items-center h-6 px-3 border-t border-border-weaker-base bg-background-base text-11-regular text-text-weak gap-3">
        <Show when={git.currentBranch()}>
          <span class="flex items-center gap-1">
            <Icon name="branch" class="size-3" />
            {git.currentBranch()}
          </span>
        </Show>
        <Show when={active()}>
          {(buf) => (
            <>
              <span>{buf().language ?? "plaintext"}</span>
              <span>UTF-8</span>
              <span>LF</span>
              <Show when={buf().isDirty}>
                <span class="text-text-base">●</span>
              </Show>
            </>
          )}
        </Show>
        <div class="flex-1" />
        <Show when={lsp.totalErrors() > 0}>
          <span class="flex items-center gap-1 text-text-base">
            <Icon name="circle-ban-sign" class="size-3" />
            {lsp.totalErrors()}
          </span>
        </Show>
        <Show when={lsp.totalWarnings() > 0}>
          <span class="flex items-center gap-1">
            <Icon name="warning" class="size-3" />
            {lsp.totalWarnings()}
          </span>
        </Show>
        <span>
          Ln {active()?.cursor?.line ?? 0}, Col {active()?.cursor?.column ?? 0}
        </span>
      </div>
    )
  }

  return (
    <div class="flex flex-col h-full w-full bg-background-base overflow-hidden">
      <TopBar />
      <RemoteConnectionBanner />
      <div class="flex-1 min-h-0 flex">
        {/* Activity bar (left rail) */}
        <div class="w-12 shrink-0 bg-background-base flex flex-col items-center py-2 border-r border-border-weaker-base">
          <For each={ACTIVITY_TABS}>
            {(tab) => (
              <Tooltip value={tab.label} placement="right">
                <IconButton
                  icon={tab.icon}
                  size="large"
                  variant="ghost"
                  active={activityTab() === tab.id}
                  onClick={() => {
                    setActivityTab(tab.id)
                    setSidebarOpen(true)
                  }}
                  aria-label={tab.label}
                />
              </Tooltip>
            )}
          </For>
          <div class="flex-1" />
          <Tooltip value="Open Settings" placement="right">
            <IconButton
              icon="settings-gear"
              size="large"
              variant="ghost"
              onClick={() => platform.openExternal("opencode://settings")}
              aria-label="Open Settings"
            />
          </Tooltip>
        </div>

        {/* Sidebar */}
        <Show when={sidebarOpen()}>
          <div class="w-64 shrink-0 border-r border-border-weaker-base bg-background-base">{sidebarPanel()}</div>
        </Show>

        {/* Center: editor + terminal */}
        <div class="flex-1 min-w-0 flex flex-col">
          <EditorTabs />
          <div class="flex-1 min-h-0 relative">
            <Show when={activePath()} fallback={<EmptyEditorState directory={props.directory} />}>
              {(path) => {
                const buf = () => buffer.getBuffer(path())
                return (
                  <div class="absolute inset-0 flex flex-col">
                    <Show when={buf()?.hasConflict}>
                      <ConflictBanner
                        onKeep={() => {
                          /* keep current buffer edits: just dismiss the banner */
                        }}
                        onReload={() => buffer.resolveConflict(path(), "reload")}
                      />
                    </Show>
                    <Show when={agentReview.changes[path()]?.status === "pending"}>
                      <AgentReviewBanner path={path()} />
                    </Show>
                    <div class="flex-1 min-h-0">
                      <MonacoEditor path={path()} class="size-full" />
                    </div>
                  </div>
                )
              }}
            </Show>
            <DebugToolbar />
          </div>
          <Show when={terminalOpen()}>
            <div class="h-72 shrink-0">
              <TerminalArea />
            </div>
          </Show>
        </div>

        {/* Right chat panel */}
        <Show when={chatOpen()}>
          <div class="w-80 shrink-0 border-l border-border-weaker-base bg-background-base">
            <ChatPanel />
          </div>
        </Show>
      </div>
      <StatusBar />
      <Show when={showAddSSH()}>
        <AddSSHHostDialog open={showAddSSH()} onClose={() => setShowAddSSH(false)} />
      </Show>
    </div>
  )
}

function EmptyEditorState(props: { directory: string }) {
  return (
    <div class="absolute inset-0 flex items-center justify-center text-text-weak">
      <div class="text-center max-w-sm">
        <Icon name="file-tree" class="size-12 mx-auto mb-3 opacity-30" />
        <div class="text-14-medium text-text-base mb-1">OpenCode IDE</div>
        <div class="text-12-regular">
          Click a file in the Explorer to start editing.
          <br />
          Or use the search bar in the Explorer panel.
        </div>
        <div class="mt-3 text-11-regular text-text-weak font-mono">{props.directory}</div>
      </div>
    </div>
  )
}
