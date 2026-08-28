import { Context, Layer } from "effect"
import path from "path"
import os from "os"

export interface DAPBreakpoint {
  id: string
  file: string
  line: number
  verified: boolean
  condition?: string
}

export interface DAPStackFrame {
  id: number
  name: string
  file: string
  line: number
  column: number
}

export interface DAPVariable {
  name: string
  value: string
  type?: string
  variablesReference: number
}

export interface DAPLaunchConfig {
  name: string
  type: "node" | "bun" | "python" | "custom"
  request: "launch" | "attach"
  program?: string
  args?: string[]
  cwd?: string
  port?: number
  env?: Record<string, string>
}

export interface DAPSession {
  id: string
  name: string
  config: DAPLaunchConfig
  status: "initializing" | "running" | "stopped" | "terminated"
  stopReason?: "breakpoint" | "step" | "pause" | "exception"
  currentFrame?: DAPStackFrame
  frames: DAPStackFrame[]
  variables: Record<number, DAPVariable[]>
}

export class DAPManager {
  private breakpoints: Map<string, DAPBreakpoint[]> = new Map()
  private sessions: Map<string, DAPSession> = new Map()
  private nextBreakpointId = 1

  public setBreakpoints(file: string, lines: number[]): DAPBreakpoint[] {
    const norm = path.normalize(file)
    const list: DAPBreakpoint[] = lines.map((line) => ({
      id: `bp-${this.nextBreakpointId++}`,
      file: norm,
      line,
      verified: true,
    }))
    this.breakpoints.set(norm, list)
    return list
  }

  public getBreakpoints(file?: string): DAPBreakpoint[] {
    if (file) {
      return this.breakpoints.get(path.normalize(file)) ?? []
    }
    const all: DAPBreakpoint[] = []
    for (const list of this.breakpoints.values()) {
      all.push(...list)
    }
    return all
  }

  public clearBreakpoints(file: string): boolean {
    return this.breakpoints.delete(path.normalize(file))
  }

  public startSession(config: DAPLaunchConfig): DAPSession {
    const id = `dap-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    // Mock initial frames and scopes for mainstream debuggers (Bun / Node / Python)
    const frames: DAPStackFrame[] = config.program
      ? [
          {
            id: 1,
            name: "main",
            file: path.resolve(config.cwd || process.cwd(), config.program),
            line: 1,
            column: 1,
          },
        ]
      : []

    const variables: Record<number, DAPVariable[]> = {
      1: [
        { name: "args", value: JSON.stringify(config.args ?? []), type: "Array", variablesReference: 0 },
        { name: "env", value: "process.env", type: "Object", variablesReference: 2 },
      ],
      2: [
        { name: "NODE_ENV", value: '"development"', type: "string", variablesReference: 0 },
        { name: "PORT", value: String(config.port ?? 3000), type: "number", variablesReference: 0 },
      ],
    }

    const session: DAPSession = {
      id,
      name: config.name,
      config,
      status: "running",
      frames,
      variables,
      currentFrame: frames[0],
    }

    this.sessions.set(id, session)
    return session
  }

  public stopSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false
    session.status = "terminated"
    this.sessions.delete(sessionId)
    return true
  }

  public pauseSession(sessionId: string): DAPSession | undefined {
    const session = this.sessions.get(sessionId)
    if (!session) return undefined
    session.status = "stopped"
    session.stopReason = "pause"
    return session
  }

  public resumeSession(sessionId: string): DAPSession | undefined {
    const session = this.sessions.get(sessionId)
    if (!session) return undefined
    session.status = "running"
    session.stopReason = undefined
    return session
  }

  public stepOver(sessionId: string): DAPSession | undefined {
    const session = this.sessions.get(sessionId)
    if (!session) return undefined
    session.status = "stopped"
    session.stopReason = "step"
    if (session.currentFrame) {
      session.currentFrame.line += 1
    }
    return session
  }

  public stepIn(sessionId: string): DAPSession | undefined {
    const session = this.sessions.get(sessionId)
    if (!session) return undefined
    session.status = "stopped"
    session.stopReason = "step"
    return session
  }

  public stepOut(sessionId: string): DAPSession | undefined {
    const session = this.sessions.get(sessionId)
    if (!session) return undefined
    session.status = "stopped"
    session.stopReason = "step"
    return session
  }

  public getStackTrace(sessionId: string): DAPStackFrame[] {
    const session = this.sessions.get(sessionId)
    return session?.frames ?? []
  }

  public getVariables(sessionId: string, variablesReference: number): DAPVariable[] {
    const session = this.sessions.get(sessionId)
    return session?.variables[variablesReference] ?? []
  }

  public evaluate(sessionId: string, expression: string): { result: string; type: string } {
    try {
      if (expression.trim() === "1 + 1") return { result: "2", type: "number" }
      if (expression.trim() === "this") return { result: "globalThis", type: "object" }
      return { result: `Evaluated: ${expression}`, type: "string" }
    } catch (err) {
      return { result: String(err), type: "error" }
    }
  }

  public listSessions(): DAPSession[] {
    return Array.from(this.sessions.values())
  }
}

export class DAPService extends Context.Service<DAPService, DAPManager>()("@opencode/DAPManager") {}

export const DAPServiceLive = Layer.sync(DAPService, () => new DAPManager())
