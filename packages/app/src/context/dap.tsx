import { batch, createEffect, createSignal } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { useSDK } from "./sdk"
import { useServerSDK } from "./server-sdk"
import { showToast } from "@/utils/toast"

export interface Breakpoint {
  id: string
  file: string
  line: number
  verified: boolean
}

export interface StackFrame {
  id: number
  name: string
  file: string
  line: number
  column: number
}

export interface Variable {
  name: string
  value: string
  type?: string
  variablesReference: number
}

export interface DebugSession {
  id: string
  name: string
  status: "initializing" | "running" | "stopped" | "terminated"
  stopReason?: "breakpoint" | "step" | "pause" | "exception"
  currentFrame?: StackFrame
}

export interface LaunchConfig {
  name: string
  type: "node" | "bun" | "python" | "custom"
  request: "launch" | "attach"
  program?: string
  args?: string[]
  cwd?: string
  port?: number
}

export const { use: useDAP, provider: DapProvider } = createSimpleContext({
  name: "DAP",
  gate: false,
  init: () => {
    const sdk = useSDK()
    const serverSDK = useServerSDK()

    const [breakpoints, setBreakpoints] = createStore<Record<string, number[]>>({})
    const [activeSession, setActiveSession] = createSignal<DebugSession | undefined>(undefined)
    const [stackFrames, setStackFrames] = createStore<StackFrame[]>([])
    const [variables, setVariables] = createStore<Variable[]>([])
    const [consoleLogs, setConsoleLogs] = createStore<Array<{ id: string; type: "input" | "output" | "error"; text: string }>>([])
    const [isOperating, setIsOperating] = createSignal(false)

    const toggleBreakpoint = async (file: string, line: number) => {
      const existing = breakpoints[file] ?? []
      const next = existing.includes(line)
        ? existing.filter((l) => l !== line)
        : [...existing, line].sort((a, b) => a - b)

      setBreakpoints(file, next)

      try {
        const client = serverSDK().client as any
        if (client.dap?.setBreakpoints) {
          await client.dap.setBreakpoints({ file, lines: next })
        } else {
          const url = `${serverSDK().url}/dap/breakpoints`
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file, lines: next }),
          })
        }
      } catch (err) {
        console.error("[dap] Failed to synchronize breakpoints:", err)
      }
    }

    const startDebugging = async (config: LaunchConfig) => {
      try {
        setIsOperating(true)
        const client = serverSDK().client as any
        let session: DebugSession | undefined

        if (client.dap?.start) {
          const res = await client.dap.start(config)
          session = res.data
        } else {
          const url = `${serverSDK().url}/dap/start`
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
          })
          if (res.ok) session = await res.json()
        }

        if (session) {
          setActiveSession(session)
          showToast({
            variant: "success",
            title: "Debugger Started",
            description: `Session "${config.name}" launched.`,
          })
          await refreshStackTrace(session.id)
          await refreshVariables(session.id)
        }
        return session
      } catch (err) {
        showToast({
          variant: "error",
          title: "Debug Launch Failed",
          description: err instanceof Error ? err.message : String(err),
        })
        return undefined
      } finally {
        setIsOperating(false)
      }
    }

    const stopDebugging = async () => {
      const session = activeSession()
      if (!session) return
      try {
        setIsOperating(true)
        const client = serverSDK().client as any
        if (client.dap?.stop) {
          await client.dap.stop({ sessionId: session.id })
        } else {
          const url = `${serverSDK().url}/dap/stop`
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: session.id }),
          })
        }
        setActiveSession(undefined)
        setStackFrames([])
        setVariables([])
      } catch (err) {
        console.error("[dap] Failed to stop debugger:", err)
      } finally {
        setIsOperating(false)
      }
    }

    const resume = async () => {
      const session = activeSession()
      if (!session) return
      try {
        const client = serverSDK().client as any
        let updated: DebugSession | undefined
        if (client.dap?.resume) {
          const res = await client.dap.resume({ sessionId: session.id })
          updated = res.data
        } else {
          const url = `${serverSDK().url}/dap/resume`
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: session.id }),
          })
          if (res.ok) updated = await res.json()
        }
        if (updated) setActiveSession(updated)
      } catch (err) {
        console.error("[dap] Resume error:", err)
      }
    }

    const stepOver = async () => {
      const session = activeSession()
      if (!session) return
      try {
        const client = serverSDK().client as any
        let updated: DebugSession | undefined
        if (client.dap?.stepOver) {
          const res = await client.dap.stepOver({ sessionId: session.id })
          updated = res.data
        } else {
          const url = `${serverSDK().url}/dap/stepOver`
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: session.id }),
          })
          if (res.ok) updated = await res.json()
        }
        if (updated) {
          setActiveSession(updated)
          await refreshStackTrace(session.id)
          await refreshVariables(session.id)
        }
      } catch (err) {
        console.error("[dap] StepOver error:", err)
      }
    }

    const stepIn = async () => {
      const session = activeSession()
      if (!session) return
      try {
        const client = serverSDK().client as any
        let updated: DebugSession | undefined
        if (client.dap?.stepIn) {
          const res = await client.dap.stepIn({ sessionId: session.id })
          updated = res.data
        } else {
          const url = `${serverSDK().url}/dap/stepIn`
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: session.id }),
          })
          if (res.ok) updated = await res.json()
        }
        if (updated) setActiveSession(updated)
      } catch (err) {
        console.error("[dap] StepIn error:", err)
      }
    }

    const stepOut = async () => {
      const session = activeSession()
      if (!session) return
      try {
        const client = serverSDK().client as any
        let updated: DebugSession | undefined
        if (client.dap?.stepOut) {
          const res = await client.dap.stepOut({ sessionId: session.id })
          updated = res.data
        } else {
          const url = `${serverSDK().url}/dap/stepOut`
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: session.id }),
          })
          if (res.ok) updated = await res.json()
        }
        if (updated) setActiveSession(updated)
      } catch (err) {
        console.error("[dap] StepOut error:", err)
      }
    }

    const pause = async () => {
      const session = activeSession()
      if (!session) return
      try {
        const client = serverSDK().client as any
        let updated: DebugSession | undefined
        if (client.dap?.pause) {
          const res = await client.dap.pause({ sessionId: session.id })
          updated = res.data
        } else {
          const url = `${serverSDK().url}/dap/pause`
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: session.id }),
          })
          if (res.ok) updated = await res.json()
        }
        if (updated) {
          setActiveSession(updated)
          await refreshStackTrace(session.id)
          await refreshVariables(session.id)
        }
      } catch (err) {
        console.error("[dap] Pause error:", err)
      }
    }

    const refreshStackTrace = async (sessionId: string) => {
      try {
        const url = `${serverSDK().url}/dap/stackTrace?sessionId=${sessionId}`
        const res = await fetch(url)
        if (res.ok) {
          const list: StackFrame[] = await res.json()
          setStackFrames(reconcile(list))
        }
      } catch {}
    }

    const refreshVariables = async (sessionId: string) => {
      try {
        const url = `${serverSDK().url}/dap/variables?sessionId=${sessionId}`
        const res = await fetch(url)
        if (res.ok) {
          const list: Variable[] = await res.json()
          setVariables(reconcile(list))
        }
      } catch {}
    }

    const evaluate = async (expression: string) => {
      const session = activeSession()
      if (!session) return
      const logId = `eval-${Date.now()}`
      setConsoleLogs([...consoleLogs, { id: logId, type: "input", text: expression }])
      try {
        const url = `${serverSDK().url}/dap/evaluate`
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: session.id, expression }),
        })
        if (res.ok) {
          const data = await res.json()
          setConsoleLogs([...consoleLogs, { id: `${logId}-res`, type: "output", text: data.result }])
        }
      } catch (err) {
        setConsoleLogs([...consoleLogs, { id: `${logId}-err`, type: "error", text: String(err) }])
      }
    }

    return {
      breakpoints,
      activeSession,
      stackFrames,
      variables,
      consoleLogs,
      isOperating,
      toggleBreakpoint,
      startDebugging,
      stopDebugging,
      resume,
      stepOver,
      stepIn,
      stepOut,
      pause,
      evaluate,
    }
  },
})
