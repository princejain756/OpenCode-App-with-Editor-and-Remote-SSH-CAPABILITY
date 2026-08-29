/**
 * IDEPage — Workspace-level IDE workbench.
 *
 * The IDE workbench is the visual primary surface of the OpenCode IDE fork:
 * a real IDE layout with an Explorer, Remote Explorer, Source Control,
 * Problems, and Run/Debug panels, plus a Monaco editor, terminal, and
 * inline agent chat.
 *
 * This page is mounted at `/:dir/ide` and is always rendered regardless
 * of the upstream `newLayoutDesigns` setting — that's the whole point of
 * the IDE fork: the user opens a folder and gets an IDE, not the upstream
 * chat/sessions layout.
 *
 * Provider chain (kept in sync with `SessionProviders` in `pages/session.tsx`):
 *   TerminalProvider > FileProvider > BufferProvider > SplitEditorProvider >
 *   LspProvider > AgentReviewProvider > TimelineSyncProvider > SSHProvider >
 *   GitProvider > DapProvider
 *
 * CommentsProvider and PromptProvider are intentionally omitted from this
 * surface — the IDE chat panel uses a minimal local form that hands the
 * user off to the session view when they want the full rewind/fork UX.
 */

import { useParams } from "@solidjs/router"
import { ErrorBoundary, type ParentProps, Show } from "solid-js"
import { decode64 } from "@/utils/base64"
import { BufferProvider } from "@/context/buffer"
import { SplitEditorProvider } from "@/context/split-editor"
import { LspProvider } from "@/context/lsp"
import { AgentReviewProvider } from "@/context/agent-review"
import { TimelineSyncProvider } from "@/context/timeline-sync"
import { SSHProvider } from "@/context/ssh"
import { GitProvider } from "@/context/git"
import { DapProvider } from "@/context/dap"
import { FileProvider } from "@/context/file"
import { TerminalProvider } from "@/context/terminal"
import { IDEWorkbench } from "@/components/ide/ide-workbench"
import { ErrorPage } from "@/pages/error"

function IDEProviders(props: ParentProps) {
  return (
    <TerminalProvider>
      <FileProvider>
        <BufferProvider>
          <SplitEditorProvider>
            <LspProvider>
              <AgentReviewProvider>
                <TimelineSyncProvider>
                  <SSHProvider>
                    <GitProvider>
                      <DapProvider>{props.children}</DapProvider>
                    </GitProvider>
                  </SSHProvider>
                </TimelineSyncProvider>
              </AgentReviewProvider>
            </LspProvider>
          </SplitEditorProvider>
        </BufferProvider>
      </FileProvider>
    </TerminalProvider>
  )
}

export function IDEPage() {
  const params = useParams<{ dir: string }>()

  const directory = () => {
    const slug = params.dir
    if (!slug) return ""
    return decode64(slug) ?? ""
  }

  return (
    <IDEProviders>
      <ErrorBoundary fallback={(err) => <ErrorPage error={err} />}>
        <Show when={directory()} keyed fallback={<IDEEmptyState />}>
          {(dir) => (
            <div class="h-full w-full">
              <IDEWorkbench directory={dir} />
            </div>
          )}
        </Show>
      </ErrorBoundary>
    </IDEProviders>
  )
}

function IDEEmptyState() {
  return (
    <div class="h-full w-full flex items-center justify-center bg-background-base text-text-weak">
      <div class="text-center max-w-md">
        <div class="text-14-medium text-text-base mb-2">No workspace selected</div>
        <div class="text-12-regular">Open a folder to start the IDE workbench.</div>
      </div>
    </div>
  )
}

export default IDEPage
