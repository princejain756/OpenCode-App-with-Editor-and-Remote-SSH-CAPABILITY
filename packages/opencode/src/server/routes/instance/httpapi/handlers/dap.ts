import { DAPManager, DAPService } from "@/dap/manager"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"

export const dapHandlers = HttpApiBuilder.group(InstanceHttpApi, "dap", (handlers) =>
  Effect.gen(function* () {
    const dap = yield* DAPService

    const sessions = Effect.fn("DapHttpApi.sessions")(function* () {
      const list = dap.listSessions()
      return list.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        stopReason: s.stopReason,
        currentFrame: s.currentFrame,
      }))
    })

    const start = Effect.fn("DapHttpApi.start")(function* (ctx: {
      payload: {
        name: string
        type: "node" | "bun" | "python" | "custom"
        request: "launch" | "attach"
        program?: string
        args?: readonly string[]
        cwd?: string
        port?: number
      }
    }) {
      const s = dap.startSession({
        name: ctx.payload.name,
        type: ctx.payload.type,
        request: ctx.payload.request,
        program: ctx.payload.program,
        args: ctx.payload.args ? Array.from(ctx.payload.args) : undefined,
        cwd: ctx.payload.cwd,
        port: ctx.payload.port,
      })

      return {
        id: s.id,
        name: s.name,
        status: s.status,
        stopReason: s.stopReason,
        currentFrame: s.currentFrame,
      }
    })

    const stop = Effect.fn("DapHttpApi.stop")(function* (ctx: {
      payload: { sessionId: string }
    }) {
      return dap.stopSession(ctx.payload.sessionId)
    })

    const setBreakpoints = Effect.fn("DapHttpApi.setBreakpoints")(function* (ctx: {
      payload: { file: string; lines: readonly number[] }
    }) {
      const list = dap.setBreakpoints(ctx.payload.file, Array.from(ctx.payload.lines))
      return list.map((b) => ({
        id: b.id,
        file: b.file,
        line: b.line,
        verified: b.verified,
        condition: b.condition,
      }))
    })

    const getBreakpoints = Effect.fn("DapHttpApi.getBreakpoints")(function* (ctx: {
      query?: { directory?: string }
    }) {
      const list = dap.getBreakpoints()
      return list.map((b) => ({
        id: b.id,
        file: b.file,
        line: b.line,
        verified: b.verified,
        condition: b.condition,
      }))
    })

    const resume = Effect.fn("DapHttpApi.resume")(function* (ctx: {
      payload: { sessionId: string }
    }) {
      const s = dap.resumeSession(ctx.payload.sessionId)
      if (!s) throw new Error("Session not found")
      return {
        id: s.id,
        name: s.name,
        status: s.status,
        stopReason: s.stopReason,
        currentFrame: s.currentFrame,
      }
    })

    const stepOver = Effect.fn("DapHttpApi.stepOver")(function* (ctx: {
      payload: { sessionId: string }
    }) {
      const s = dap.stepOver(ctx.payload.sessionId)
      if (!s) throw new Error("Session not found")
      return {
        id: s.id,
        name: s.name,
        status: s.status,
        stopReason: s.stopReason,
        currentFrame: s.currentFrame,
      }
    })

    const stepIn = Effect.fn("DapHttpApi.stepIn")(function* (ctx: {
      payload: { sessionId: string }
    }) {
      const s = dap.stepIn(ctx.payload.sessionId)
      if (!s) throw new Error("Session not found")
      return {
        id: s.id,
        name: s.name,
        status: s.status,
        stopReason: s.stopReason,
        currentFrame: s.currentFrame,
      }
    })

    const stepOut = Effect.fn("DapHttpApi.stepOut")(function* (ctx: {
      payload: { sessionId: string }
    }) {
      const s = dap.stepOut(ctx.payload.sessionId)
      if (!s) throw new Error("Session not found")
      return {
        id: s.id,
        name: s.name,
        status: s.status,
        stopReason: s.stopReason,
        currentFrame: s.currentFrame,
      }
    })

    const pause = Effect.fn("DapHttpApi.pause")(function* (ctx: {
      payload: { sessionId: string }
    }) {
      const s = dap.pauseSession(ctx.payload.sessionId)
      if (!s) throw new Error("Session not found")
      return {
        id: s.id,
        name: s.name,
        status: s.status,
        stopReason: s.stopReason,
        currentFrame: s.currentFrame,
      }
    })

    const stackTrace = Effect.fn("DapHttpApi.stackTrace")(function* (ctx: {
      query: { sessionId: string; directory?: string; workspace?: string }
    }) {
      return dap.getStackTrace(ctx.query.sessionId)
    })

    const variables = Effect.fn("DapHttpApi.variables")(function* (ctx: {
      query: { sessionId: string; variablesReference?: string; directory?: string; workspace?: string }
    }) {
      const ref = parseInt(ctx.query.variablesReference || "1", 10) || 1
      return dap.getVariables(ctx.query.sessionId, ref)
    })

    const evaluate = Effect.fn("DapHttpApi.evaluate")(function* (ctx: {
      payload: { sessionId: string; expression: string }
    }) {
      return dap.evaluate(ctx.payload.sessionId, ctx.payload.expression)
    })

    return handlers
      .handle("sessions", sessions)
      .handle("start", start)
      .handle("stop", stop)
      .handle("setBreakpoints", setBreakpoints)
      .handle("getBreakpoints", getBreakpoints)
      .handle("resume", resume)
      .handle("stepOver", stepOver)
      .handle("stepIn", stepIn)
      .handle("stepOut", stepOut)
      .handle("pause", pause)
      .handle("stackTrace", stackTrace)
      .handle("variables", variables)
      .handle("evaluate", evaluate)
  }),
)
