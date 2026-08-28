import { createSignal, createMemo, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Button } from "@opencode-ai/ui/button"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { useBuffer } from "@/context/buffer"
import { useSDK } from "@/context/sdk"
import { useServerSDK } from "@/context/server-sdk"
import { showToast } from "@/utils/toast"

export interface SearchMatch {
  path: string
  lineNumber: number
  lineText: string
  submatches: Array<{ start: number; end: number; text: string }>
}

export interface FileSearchResults {
  path: string
  matches: SearchMatch[]
}

export function WorkspaceSearch(props: { onClose?: () => void }) {
  const buffer = useBuffer()
  const sdk = useSDK()
  const serverSDK = useServerSDK()

  const [query, setQuery] = createSignal("")
  const [replaceText, setReplaceText] = createSignal("")
  const [showReplace, setShowReplace] = createSignal(false)
  const [caseSensitive, setCaseSensitive] = createSignal(false)
  const [isRegex, setIsRegex] = createSignal(false)
  const [matchWholeWord, setMatchWholeWord] = createSignal(false)
  const [includePattern, setIncludePattern] = createSignal("")
  const [excludePattern, setExcludePattern] = createSignal("")
  const [showFilters, setShowFilters] = createSignal(false)

  const [isSearching, setIsSearching] = createSignal(false)
  const [isReplacing, setIsReplacing] = createSignal(false)
  const [results, setResults] = createSignal<FileSearchResults[]>([])
  const [expandedFiles, setExpandedFiles] = createSignal<Record<string, boolean>>({})

  const totalMatches = createMemo(() => {
    return results().reduce((acc, file) => acc + file.matches.length, 0)
  })

  const toggleFileExpanded = (path: string) => {
    setExpandedFiles((prev) => ({
      ...prev,
      [path]: prev[path] === undefined ? false : !prev[path],
    }))
  }

  const handleSearch = async () => {
    const q = query().trim()
    if (!q) {
      setResults([])
      return
    }

    setIsSearching(true)
    try {
      const client = sdk().client as any
      let rawMatches: any[] = []

      if (client.file?.findText) {
        const resp = await client.file.findText({
          pattern: q,
          caseSensitive: caseSensitive() ? "true" : "false",
          isRegex: isRegex() ? "true" : "false",
          matchWholeWord: matchWholeWord() ? "true" : "false",
          include: includePattern() || undefined,
          exclude: excludePattern() || undefined,
          limit: 300,
        })
        rawMatches = resp.data ?? []
      } else {
        const params = new URLSearchParams({
          pattern: q,
          caseSensitive: caseSensitive() ? "true" : "false",
          isRegex: isRegex() ? "true" : "false",
          matchWholeWord: matchWholeWord() ? "true" : "false",
          limit: "300",
        })
        if (includePattern()) params.set("include", includePattern())
        if (excludePattern()) params.set("exclude", excludePattern())

        const url = `${serverSDK().url}/find?${params.toString()}`
        const resp = await fetch(url)
        if (resp.ok) {
          rawMatches = await resp.json()
        }
      }

      // Group matches by file path
      const byFile = new Map<string, SearchMatch[]>()
      for (const m of rawMatches) {
        const filePath = m.path?.text ?? m.entry?.path ?? ""
        if (!filePath) continue

        const matchItem: SearchMatch = {
          path: filePath,
          lineNumber: m.line_number ?? m.line ?? 1,
          lineText: m.lines?.text ?? m.text ?? "",
          submatches: (m.submatches ?? []).map((sm: any) => ({
            start: sm.start ?? 0,
            end: sm.end ?? 0,
            text: sm.match?.text ?? sm.text ?? "",
          })),
        }

        const list = byFile.get(filePath) ?? []
        list.push(matchItem)
        byFile.set(filePath, list)
      }

      const grouped: FileSearchResults[] = []
      const expandMap: Record<string, boolean> = {}
      for (const [path, matches] of byFile.entries()) {
        grouped.push({ path, matches })
        expandMap[path] = true // default expanded
      }

      setResults(grouped)
      setExpandedFiles(expandMap)
    } catch (err) {
      showToast({
        variant: "error",
        title: "Search failed",
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleReplaceAll = async () => {
    const q = query().trim()
    const r = replaceText()
    if (!q) return

    setIsReplacing(true)
    try {
      const payload = {
        query: q,
        replace: r,
        caseSensitive: caseSensitive(),
        isRegex: isRegex(),
        matchWholeWord: matchWholeWord(),
      }

      const client = serverSDK().client as any
      let resultData: { filesModified: string[]; matchesReplaced: number } | undefined

      if (client.file?.replace) {
        const resp = await client.file.replace(payload)
        resultData = resp.data
      } else {
        const url = `${serverSDK().url}/file/replace`
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (resp.ok) {
          resultData = await resp.json()
        }
      }

      if (resultData) {
        showToast({
          variant: "success",
          title: "Replace complete",
          description: `Replaced ${resultData.matchesReplaced} occurrence(s) in ${resultData.filesModified.length} file(s).`,
        })

        // Reload open affected buffers
        for (const file of resultData.filesModified) {
          if (buffer.getBuffer(file)) {
            void buffer.loadBuffer(file, { force: true })
          }
        }

        // Re-run search to show updated state
        void handleSearch()
      }
    } catch (err) {
      showToast({
        variant: "error",
        title: "Replace failed",
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setIsReplacing(false)
    }
  }

  const openMatch = (match: SearchMatch) => {
    void buffer.open(match.path)
    buffer.updateCursor(match.path, match.lineNumber, (match.submatches[0]?.start ?? 0) + 1)
  }

  return (
    <div class="flex flex-col h-full w-full bg-surface-base border-r border-border-base select-none">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-2 border-b border-border-base">
        <span class="text-xs font-semibold text-text-strong uppercase tracking-wider">Search</span>
        <Show when={props.onClose}>
          <IconButton icon="close-small" variant="ghost" class="size-5" onClick={props.onClose} />
        </Show>
      </div>

      {/* Input Controls */}
      <div class="p-3 space-y-2 border-b border-border-base bg-surface-raised/40">
        {/* Find Input */}
        <div class="relative flex items-center">
          <input
            type="text"
            placeholder="Search"
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSearch()
            }}
            class="w-full pl-2.5 pr-20 py-1.5 bg-surface-raised border border-border-base rounded text-xs text-text-base focus:outline-none focus:border-border-strong placeholder:text-text-faint"
          />
          <div class="absolute right-1.5 flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setCaseSensitive(!caseSensitive())}
              class={`px-1 py-0.5 rounded text-[10px] font-mono transition-colors ${
                caseSensitive() ? "bg-accent-base text-accent-contrast font-bold" : "text-text-muted hover:text-text-base"
              }`}
              title="Match Case (Alt+C)"
            >
              Aa
            </button>
            <button
              type="button"
              onClick={() => setMatchWholeWord(!matchWholeWord())}
              class={`px-1 py-0.5 rounded text-[10px] font-mono transition-colors ${
                matchWholeWord() ? "bg-accent-base text-accent-contrast font-bold" : "text-text-muted hover:text-text-base"
              }`}
              title="Match Whole Word (Alt+W)"
            >
              \b
            </button>
            <button
              type="button"
              onClick={() => setIsRegex(!isRegex())}
              class={`px-1 py-0.5 rounded text-[10px] font-mono transition-colors ${
                isRegex() ? "bg-accent-base text-accent-contrast font-bold" : "text-text-muted hover:text-text-base"
              }`}
              title="Use Regular Expression (Alt+R)"
            >
              .*
            </button>
          </div>
        </div>

        {/* Toggle Replace Row */}
        <div class="flex items-center justify-between text-xs text-text-muted">
          <button
            type="button"
            onClick={() => setShowReplace(!showReplace())}
            class="flex items-center gap-1 hover:text-text-base text-[11px]"
          >
            <Icon name={showReplace() ? "chevron-down" : "chevron-right"} class="size-3" />
            <span>Replace</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters())}
            class="text-[11px] hover:text-text-base"
          >
            {showFilters() ? "Hide Filters" : "Filters"}
          </button>
        </div>

        {/* Replace Input */}
        <Show when={showReplace()}>
          <div class="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Replace"
              value={replaceText()}
              onInput={(e) => setReplaceText(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleReplaceAll()
              }}
              class="flex-1 px-2.5 py-1 bg-surface-raised border border-border-base rounded text-xs text-text-base focus:outline-none focus:border-border-strong placeholder:text-text-faint"
            />
            <Button
              size="small"
              variant="secondary"
              disabled={isReplacing() || !query().trim()}
              onClick={() => void handleReplaceAll()}
              class="h-7 px-2 text-xs shrink-0"
              title="Replace All (Cmd/Ctrl+Alt+Enter)"
            >
              Replace All
            </Button>
          </div>
        </Show>

        {/* Include / Exclude Filters */}
        <Show when={showFilters()}>
          <div class="space-y-1.5 pt-1">
            <input
              type="text"
              placeholder="files to include (e.g. src/**/*.ts)"
              value={includePattern()}
              onInput={(e) => setIncludePattern(e.currentTarget.value)}
              class="w-full px-2 py-1 bg-surface-raised border border-border-base rounded text-[11px] text-text-base focus:outline-none focus:border-border-strong placeholder:text-text-faint"
            />
            <input
              type="text"
              placeholder="files to exclude (e.g. dist/**)"
              value={excludePattern()}
              onInput={(e) => setExcludePattern(e.currentTarget.value)}
              class="w-full px-2 py-1 bg-surface-raised border border-border-base rounded text-[11px] text-text-base focus:outline-none focus:border-border-strong placeholder:text-text-faint"
            />
          </div>
        </Show>

        {/* Search Action Bar */}
        <div class="flex items-center justify-between pt-1">
          <span class="text-[11px] text-text-faint">
            <Show when={results().length > 0}>
              {totalMatches()} results in {results().length} files
            </Show>
          </span>
          <Button
            size="small"
            variant="primary"
            disabled={isSearching() || !query().trim()}
            onClick={() => void handleSearch()}
            class="h-6 px-3 text-xs"
          >
            {isSearching() ? "Searching..." : "Search"}
          </Button>
        </div>
      </div>

      {/* Results Tree */}
      <div class="flex-1 min-h-0 overflow-y-auto p-1 text-xs">
        <Show when={results().length === 0 && !isSearching() && query().trim()}>
          <div class="px-3 py-6 text-center text-text-muted text-xs">No results found</div>
        </Show>

        <For each={results()}>
          {(file) => {
            const isExpanded = () => expandedFiles()[file.path] !== false

            return (
              <div class="mb-1">
                {/* File Row */}
                <button
                  type="button"
                  onClick={() => toggleFileExpanded(file.path)}
                  class="flex items-center gap-1.5 w-full px-2 py-1 hover:bg-surface-raised rounded text-left font-medium text-text-base group"
                >
                  <Icon name={isExpanded() ? "chevron-down" : "chevron-right"} class="size-3 text-text-muted shrink-0" />
                  <FileIcon node={{ path: file.path, type: "file" }} class="size-3.5 shrink-0" />
                  <span class="truncate flex-1 font-mono text-[11px]">{file.path}</span>
                  <span class="px-1.5 py-0.2 bg-surface-raised text-[10px] rounded-full text-text-muted font-mono">
                    {file.matches.length}
                  </span>
                </button>

                {/* Matches Rows */}
                <Show when={isExpanded()}>
                  <div class="pl-4 pr-1 py-0.5 space-y-0.5">
                    <For each={file.matches}>
                      {(match) => (
                        <button
                          type="button"
                          onClick={() => openMatch(match)}
                          class="flex items-baseline gap-2 w-full px-2 py-0.5 hover:bg-surface-raised/80 rounded text-left text-text-muted hover:text-text-base transition-colors"
                        >
                          <span class="text-[10px] text-text-faint font-mono w-6 text-right shrink-0">
                            {match.lineNumber}
                          </span>
                          <span class="truncate font-mono text-[11px] flex-1 text-text-base">
                            {match.lineText.trim()}
                          </span>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            )
          }}
        </For>
      </div>
    </div>
  )
}
