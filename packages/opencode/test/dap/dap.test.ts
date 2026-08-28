import { describe, expect, test } from "bun:test"
import { DAPManager } from "../../src/dap/manager"

describe("DAP Debugger Engine & Session Lifecycle", () => {
  const dap = new DAPManager()

  test("sets, queries, and clears breakpoints on workspace files", () => {
    const file = "/src/index.ts"
    const bps = dap.setBreakpoints(file, [10, 25, 42])

    expect(bps).toHaveLength(3)
    expect(bps[0].line).toBe(10)
    expect(bps[0].verified).toBe(true)

    const queried = dap.getBreakpoints(file)
    expect(queried).toHaveLength(3)

    dap.clearBreakpoints(file)
    expect(dap.getBreakpoints(file)).toHaveLength(0)
  })

  test("launches debug session, handles pause, step over, and resume", () => {
    const session = dap.startSession({
      name: "Debug Bun Server",
      type: "bun",
      request: "launch",
      program: "src/server.ts",
      port: 4096,
    })

    expect(session.status).toBe("running")
    expect(session.name).toBe("Debug Bun Server")

    // Pause session
    const paused = dap.pauseSession(session.id)
    expect(paused?.status).toBe("stopped")
    expect(paused?.stopReason).toBe("pause")

    // Step over
    const initialLine = session.currentFrame?.line ?? 1
    const stepped = dap.stepOver(session.id)
    expect(stepped?.currentFrame?.line).toBe(initialLine + 1)

    // Resume
    const resumed = dap.resumeSession(session.id)
    expect(resumed?.status).toBe("running")

    // Terminate
    const stopped = dap.stopSession(session.id)
    expect(stopped).toBe(true)
  })

  test("evaluates expressions and inspects scopes", () => {
    const session = dap.startSession({
      name: "Node Eval Test",
      type: "node",
      request: "launch",
    })

    const evalResult = dap.evaluate(session.id, "1 + 1")
    expect(evalResult.result).toBe("2")
    expect(evalResult.type).toBe("number")

    const vars = dap.getVariables(session.id, 1)
    expect(vars.length).toBeGreaterThan(0)
    expect(vars[0].name).toBe("args")

    dap.stopSession(session.id)
  })
})
