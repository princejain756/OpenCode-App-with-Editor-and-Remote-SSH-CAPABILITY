import { batch, createEffect, createMemo, onCleanup } from "solid-js"
import { createStore, produce, reconcile } from "solid-js/store"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { showToast } from "@/utils/toast"
import { useParams } from "@solidjs/router"
import { base64Encode } from "@opencode-ai/core/util/encode"
import { getFilename } from "@opencode-ai/core/util/path"
import { useSDK } from "./sdk"
import { useServerSDK } from "./server-sdk"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { createPathHelpers } from "./file/path"
import { SessionRouteKey, SessionStateKey } from "@/utils/server-scope"
import {
  DEFAULT_EDITOR_SETTINGS,
  detectLanguage,
  type EditorBuffer,
  type EditorSettings,
  type ConflictResolution,
} from "./buffer/types"

export * from "./buffer/types"

const EDITOR_SETTINGS_KEY = "opencode.editor.settings.v1"

function loadEditorSettings(): EditorSettings {
  try {
    const raw = localStorage.getItem(EDITOR_SETTINGS_KEY)
    if (raw) return { ...DEFAULT_EDITOR_SETTINGS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_EDITOR_SETTINGS
}

function saveEditorSettings(settings: EditorSettings) {
  try {
    localStorage.setItem(EDITOR_SETTINGS_KEY, JSON.stringify(settings))
  } catch {}
}

export const { use: useBuffer, provider: BufferProvider } = createSimpleContext({
  name: "Buffer",
  gate: false,
  init: () => {
    const sdk = useSDK()
    const serverSDK = useServerSDK()
    const language = useLanguage()
    const layout = useLayout()
    const params = useParams()

    const scope = createMemo(() => sdk().directory)
    const path = createPathHelpers(scope)
    const tabs = layout.tabs(() =>
      SessionStateKey.from(serverSDK().scope, SessionRouteKey.fromRoute(base64Encode(sdk().directory), params.id)),
    )

    const [buffers, setBuffers] = createStore<Record<string, EditorBuffer>>({})
    const [settings, setSettingsStore] = createStore<EditorSettings>(loadEditorSettings())
    const inflightLoads = new Map<string, Promise<EditorBuffer | undefined>>()

    const setSettings = (update: Partial<EditorSettings> | ((prev: EditorSettings) => Partial<EditorSettings>)) => {
      setSettingsStore(produce((draft) => {
        const next = typeof update === "function" ? update(draft as EditorSettings) : update
        Object.assign(draft, next)
      }))
      saveEditorSettings(settings)
    }

    createEffect(() => {
      scope()
      inflightLoads.clear()
      batch(() => {
        setBuffers(reconcile({}))
      })
    })

    const activeTab = createMemo(() => tabs.active())
    const activePath = createMemo(() => {
      const current = activeTab()
      if (!current) return undefined
      return path.pathFromTab(current)
    })

    const activeBuffer = createMemo(() => {
      const p = activePath()
      if (!p) return undefined
      return buffers[p]
    })

    const ensureBuffer = (normalizedPath: string): EditorBuffer => {
      const existing = buffers[normalizedPath]
      if (existing) return existing

      const newBuffer: EditorBuffer = {
        path: normalizedPath,
        name: getFilename(normalizedPath),
        content: "",
        diskContent: "",
        diskVersion: 0,
        bufferVersion: 0,
        isDirty: false,
        isLoading: false,
        isSaving: false,
        hasConflict: false,
        language: detectLanguage(normalizedPath),
      }
      setBuffers(normalizedPath, newBuffer)
      return newBuffer
    }

    const loadBuffer = async (inputPath: string, options?: { force?: boolean }): Promise<EditorBuffer | undefined> => {
      const norm = path.normalize(inputPath)
      if (!norm) return undefined

      const current = buffers[norm]
      if (!options?.force && current && !current.isLoading && current.diskVersion > 0) {
        return current
      }

      const dir = scope()
      const cacheKey = `${dir}:${norm}`
      const pending = inflightLoads.get(cacheKey)
      if (pending) return pending

      ensureBuffer(norm)
      setBuffers(norm, "isLoading", true)
      setBuffers(norm, "error", undefined)

      const promise = (async () => {
        try {
          const resp = await sdk().client.file.read({ path: norm })
          if (scope() !== dir) return undefined
          const data = resp.data
          const textContent = typeof data?.content === "string" ? data.content : ""

          setBuffers(norm, produce((draft) => {
            draft.isLoading = false
            draft.diskVersion += 1
            draft.lastModified = Date.now()

            if (draft.isDirty && draft.content !== textContent) {
              draft.hasConflict = true
              draft.conflictContent = textContent
            } else {
              draft.content = textContent
              draft.diskContent = textContent
              draft.isDirty = false
              draft.hasConflict = false
              draft.conflictContent = undefined
            }
          }))

          return buffers[norm]
        } catch (err) {
          if (scope() !== dir) return undefined
          const errMsg = err instanceof Error ? err.message : String(err)
          setBuffers(norm, produce((draft) => {
            draft.isLoading = false
            draft.error = errMsg
          }))
          return undefined
        } finally {
          inflightLoads.delete(cacheKey)
        }
      })()

      inflightLoads.set(cacheKey, promise)
      return promise
    }

    const open = async (inputPath: string, options?: { focus?: boolean; preview?: boolean }) => {
      const norm = path.normalize(inputPath)
      if (!norm) return
      ensureBuffer(norm)
      const tabKey = path.tab(norm)
      tabs.open(tabKey)
      await loadBuffer(norm)
    }

    const updateContent = (inputPath: string, newContent: string) => {
      const norm = path.normalize(inputPath)
      if (!norm) return
      ensureBuffer(norm)

      setBuffers(norm, produce((draft) => {
        if (draft.content === newContent) return
        draft.content = newContent
        draft.bufferVersion += 1
        draft.isDirty = draft.content !== draft.diskContent
      }))
    }

    const save = async (inputPath: string): Promise<boolean> => {
      const norm = path.normalize(inputPath)
      if (!norm) return false
      const buffer = buffers[norm]
      if (!buffer) return false

      setBuffers(norm, "isSaving", true)
      try {
        const contentToWrite = buffer.content
        const client = serverSDK().client as any
        if (client.file?.write) {
          await client.file.write({ path: norm, content: contentToWrite })
        } else {
          const url = `${serverSDK().url}/file/write`
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: norm, content: contentToWrite }),
          })
          if (!response.ok) throw new Error(`Write failed with status ${response.status}`)
        }

        setBuffers(norm, produce((draft) => {
          draft.isSaving = false
          draft.diskContent = contentToWrite
          draft.diskVersion += 1
          draft.isDirty = false
          draft.hasConflict = false
          draft.conflictContent = undefined
          draft.lastModified = Date.now()
        }))

        showToast({
          variant: "success",
          title: "Saved",
          description: `${getFilename(norm)} saved successfully`,
        })
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setBuffers(norm, produce((draft) => {
          draft.isSaving = false
          draft.error = message
        }))
        showToast({
          variant: "error",
          title: language.t("common.requestFailed"),
          description: `Failed to save ${norm}: ${message}`,
        })
        return false
      }
    }

    const saveAll = async (): Promise<boolean> => {
      const dirtyPaths = Object.keys(buffers).filter((p) => buffers[p]?.isDirty)
      if (dirtyPaths.length === 0) return true
      const results = await Promise.all(dirtyPaths.map((p) => save(p)))
      return results.every(Boolean)
    }

    const revert = (inputPath: string) => {
      const norm = path.normalize(inputPath)
      if (!norm) return
      const buf = buffers[norm]
      if (!buf) return

      setBuffers(norm, produce((draft) => {
        draft.content = draft.diskContent
        draft.isDirty = false
        draft.hasConflict = false
        draft.conflictContent = undefined
      }))
    }

    const resolveConflict = (inputPath: string, resolution: ConflictResolution) => {
      const norm = path.normalize(inputPath)
      if (!norm) return
      const buf = buffers[norm]
      if (!buf) return

      if (resolution === "reload") {
        setBuffers(norm, produce((draft) => {
          if (draft.conflictContent !== undefined) {
            draft.content = draft.conflictContent
            draft.diskContent = draft.conflictContent
          }
          draft.isDirty = false
          draft.hasConflict = false
          draft.conflictContent = undefined
        }))
      } else if (resolution === "keep") {
        setBuffers(norm, produce((draft) => {
          draft.hasConflict = false
          draft.conflictContent = undefined
        }))
      }
    }

    const updateCursor = (inputPath: string, line: number, column: number) => {
      const norm = path.normalize(inputPath)
      if (!norm) return
      setBuffers(norm, produce((draft) => {
        draft.cursor = { line, column }
      }))
    }

    const updateScroll = (inputPath: string, scrollTop: number, scrollLeft: number) => {
      const norm = path.normalize(inputPath)
      if (!norm) return
      setBuffers(norm, produce((draft) => {
        draft.scrollTop = scrollTop
        draft.scrollLeft = scrollLeft
      }))
    }

    const createFile = async (filePath: string, initialContent = ""): Promise<boolean> => {
      const norm = path.normalize(filePath)
      if (!norm) return false
      try {
        const client = serverSDK().client as any
        if (client.file?.create) {
          await client.file.create({ path: norm, content: initialContent, isDirectory: false })
        } else {
          const url = `${serverSDK().url}/file/create`
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: norm, content: initialContent, isDirectory: false }),
          })
          if (!response.ok) throw new Error(`Create file failed with status ${response.status}`)
        }

        await open(norm)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        showToast({
          variant: "error",
          title: "File creation failed",
          description: message,
        })
        return false
      }
    }

    const createDirectory = async (dirPath: string): Promise<boolean> => {
      const norm = path.normalize(dirPath)
      if (!norm) return false
      try {
        const client = serverSDK().client as any
        if (client.file?.create) {
          await client.file.create({ path: norm, isDirectory: true })
        } else {
          const url = `${serverSDK().url}/file/create`
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: norm, isDirectory: true }),
          })
          if (!response.ok) throw new Error(`Create directory failed with status ${response.status}`)
        }
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        showToast({
          variant: "error",
          title: "Folder creation failed",
          description: message,
        })
        return false
      }
    }

    const deletePath = async (targetPath: string, recursive = true): Promise<boolean> => {
      const norm = path.normalize(targetPath)
      if (!norm) return false
      try {
        const client = serverSDK().client as any
        if (client.file?.delete) {
          await client.file.delete({ path: norm, recursive })
        } else {
          const url = `${serverSDK().url}/file/delete`
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: norm, recursive }),
          })
          if (!response.ok) throw new Error(`Delete failed with status ${response.status}`)
        }

        const tabKey = path.tab(norm)
        tabs.close(tabKey)
        setBuffers(norm, undefined as any)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        showToast({
          variant: "error",
          title: "Delete failed",
          description: message,
        })
        return false
      }
    }

    const renamePath = async (oldPath: string, newPath: string): Promise<boolean> => {
      const normOld = path.normalize(oldPath)
      const normNew = path.normalize(newPath)
      if (!normOld || !normNew) return false
      try {
        const client = serverSDK().client as any
        if (client.file?.rename) {
          await client.file.rename({ oldPath: normOld, newPath: normNew })
        } else {
          const url = `${serverSDK().url}/file/rename`
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ oldPath: normOld, newPath: normNew }),
          })
          if (!response.ok) throw new Error(`Rename failed with status ${response.status}`)
        }

        const existingBuf = buffers[normOld]
        if (existingBuf) {
          setBuffers(normNew, {
            ...existingBuf,
            path: normNew,
            name: getFilename(normNew),
            language: detectLanguage(normNew),
          })
          setBuffers(normOld, undefined as any)
        }

        const oldTabKey = path.tab(normOld)
        const newTabKey = path.tab(normNew)
        if (tabs.all().includes(oldTabKey)) {
          tabs.close(oldTabKey)
          tabs.open(newTabKey)
        }
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        showToast({
          variant: "error",
          title: "Rename failed",
          description: message,
        })
        return false
      }
    }

    // Watcher integration for external modifications
    const handleExternalChange = (filePath: string) => {
      const norm = path.normalize(filePath)
      if (!norm) return
      const buf = buffers[norm]
      if (!buf) return

      sdk()
        .client.file.read({ path: norm })
        .then((resp) => {
          const diskText = typeof resp.data?.content === "string" ? resp.data.content : ""
          setBuffers(norm, produce((draft) => {
            draft.diskVersion += 1
            draft.lastModified = Date.now()

            if (draft.isDirty) {
              if (draft.content !== diskText) {
                draft.hasConflict = true
                draft.conflictContent = diskText
              }
            } else {
              draft.content = diskText
              draft.diskContent = diskText
              draft.isDirty = false
              draft.hasConflict = false
              draft.conflictContent = undefined
            }
          }))
        })
        .catch(() => {})
    }

    const unsubEvents = serverSDK().event.on(sdk().directory, (event: any) => {
      if (event.type === "file.watcher.updated") {
        const files: string[] = event.properties?.files ?? []
        for (const file of files) {
          handleExternalChange(file)
        }
      }
    })
    onCleanup(unsubEvents)

    return {
      buffers,
      settings,
      setSettings,
      activeTab,
      activePath,
      activeBuffer,
      getBuffer: (filePath: string) => {
        const norm = path.normalize(filePath)
        return norm ? buffers[norm] : undefined
      },
      ensureBuffer,
      loadBuffer,
      open,
      updateContent,
      save,
      saveAll,
      revert,
      resolveConflict,
      updateCursor,
      updateScroll,
      createFile,
      createDirectory,
      deletePath,
      renamePath,
    }
  },
})
