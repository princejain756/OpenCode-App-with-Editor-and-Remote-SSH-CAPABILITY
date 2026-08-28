import fs from "fs"
import path from "path"
import os from "os"
import { spawn, type ChildProcess } from "child_process"
import { parseSSHConfigFile, type SSHHostConfig } from "./config"
import { Effect, Layer, Context } from "effect"

export interface SSHHostRecord extends SSHHostConfig {
  label?: string
  password?: string
  passphrase?: string
  lastConnected?: number
  defaultDirectory?: string
}

export interface SSHActiveConnection {
  hostId: string
  host: string
  hostName: string
  user: string
  port: number
  localPort: number
  remotePort: number
  status: "connecting" | "connected" | "disconnected" | "error"
  error?: string
  connectedAt?: number
  remoteOS?: string
  process?: ChildProcess
  controlSocket?: string
}

export interface SSHStatusResponse {
  activeConnections: Array<{
    hostId: string
    host: string
    hostName: string
    user: string
    port: number
    localPort: number
    status: string
    connectedAt?: number
    remoteOS?: string
    error?: string
  }>
}

export class SSHManager {
  private customHostsPath: string
  private customHosts: Map<string, SSHHostRecord> = new Map()
  private activeConnections: Map<string, SSHActiveConnection> = new Map()

  constructor() {
    const dataDir = path.join(os.homedir(), ".opencode")
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    this.customHostsPath = path.join(dataDir, "ssh_hosts.json")
    this.loadCustomHosts()
  }

  private loadCustomHosts() {
    try {
      if (fs.existsSync(this.customHostsPath)) {
        const raw = fs.readFileSync(this.customHostsPath, "utf8")
        const list: SSHHostRecord[] = JSON.parse(raw)
        for (const h of list) {
          this.customHosts.set(h.id, h)
        }
      }
    } catch (err) {
      console.error("[ssh] Failed to load custom hosts:", err)
    }
  }

  private saveCustomHosts() {
    try {
      const list = Array.from(this.customHosts.values())
      fs.writeFileSync(this.customHostsPath, JSON.stringify(list, null, 2), "utf8")
    } catch (err) {
      console.error("[ssh] Failed to save custom hosts:", err)
    }
  }

  public getAllHosts(): SSHHostRecord[] {
    const configHosts = parseSSHConfigFile()
    const result: SSHHostRecord[] = []

    // Custom hosts first
    for (const h of this.customHosts.values()) {
      result.push(h)
    }

    // Config hosts (if not overridden by custom)
    for (const ch of configHosts) {
      if (!this.customHosts.has(ch.id)) {
        result.push(ch)
      }
    }

    return result
  }

  public saveHost(host: Omit<SSHHostRecord, "source">): SSHHostRecord {
    const record: SSHHostRecord = {
      ...host,
      source: "custom",
    }
    this.customHosts.set(record.id, record)
    this.saveCustomHosts()
    return record
  }

  public removeHost(id: string): boolean {
    const deleted = this.customHosts.delete(id)
    if (deleted) {
      this.saveCustomHosts()
    }
    return deleted
  }

  public async connect(hostId: string): Promise<SSHActiveConnection> {
    const all = this.getAllHosts()
    const target = all.find((h) => h.id === hostId || h.host === hostId)
    if (!target) {
      throw new Error(`SSH Host not found: ${hostId}`)
    }

    // Check if already active
    const existing = this.activeConnections.get(target.id)
    if (existing && existing.status === "connected") {
      return existing
    }

    const hostName = target.hostName || target.host
    const user = target.user || os.userInfo().username
    const port = target.port || 22
    const localPort = Math.floor(Math.random() * (65000 - 30000) + 30000)
    const remotePort = 4096 // Default OpenCode remote server port

    const connection: SSHActiveConnection = {
      hostId: target.id,
      host: target.host,
      hostName,
      user,
      port,
      localPort,
      remotePort,
      status: "connecting",
    }
    this.activeConnections.set(target.id, connection)

    const socketDir = path.join(os.homedir(), ".opencode", "ssh-sockets")
    if (!fs.existsSync(socketDir)) {
      fs.mkdirSync(socketDir, { recursive: true })
    }
    const controlSocket = path.join(socketDir, `sock-${target.host.replace(/[^a-zA-Z0-9_-]/g, "_")}`)
    connection.controlSocket = controlSocket

    // Build SSH command arguments
    const sshArgs: string[] = [
      "-N", // Do not execute a remote command (port forwarding only)
      "-M", // Master mode for connection sharing
      "-S",
      controlSocket,
      "-o",
      "ControlPersist=10m",
      "-o",
      "ServerAliveInterval=30",
      "-o",
      "ServerAliveCountMax=3",
      "-o",
      "ExitOnForwardFailure=yes",
      "-p",
      String(port),
      "-L",
      `${localPort}:127.0.0.1:${remotePort}`,
    ]

    if (target.identityFile && target.identityFile.length > 0) {
      for (const keyFile of target.identityFile) {
        sshArgs.push("-i", keyFile)
      }
    }

    if (target.proxyJump) {
      sshArgs.push("-J", target.proxyJump)
    }

    if (target.forwardAgent) {
      sshArgs.push("-A")
    }

    sshArgs.push(`${user}@${hostName}`)

    return new Promise<SSHActiveConnection>((resolve, reject) => {
      try {
        const proc = spawn("ssh", sshArgs, {
          stdio: ["ignore", "pipe", "pipe"],
          detached: false,
        })

        connection.process = proc

        let stdoutData = ""
        let stderrData = ""

        proc.stdout?.on("data", (d) => {
          stdoutData += d.toString()
        })

        proc.stderr?.on("data", (d) => {
          stderrData += d.toString()
        })

        // Give ssh 1.5s to establish tunnel or detect failure
        const timer = setTimeout(() => {
          connection.status = "connected"
          connection.connectedAt = Date.now()
          connection.remoteOS = "Linux (Ubuntu/Debian)"

          // Update lastConnected on host
          if (this.customHosts.has(target.id)) {
            const hostRec = this.customHosts.get(target.id)!
            hostRec.lastConnected = Date.now()
            this.saveCustomHosts()
          }

          resolve(connection)
        }, 1500)

        proc.on("error", (err) => {
          clearTimeout(timer)
          connection.status = "error"
          connection.error = err.message
          reject(err)
        })

        proc.on("exit", (code) => {
          clearTimeout(timer)
          if (connection.status === "connecting") {
            connection.status = "error"
            connection.error = stderrData || `SSH exited with code ${code}`
            reject(new Error(connection.error))
          } else {
            connection.status = "disconnected"
          }
        })
      } catch (err) {
        connection.status = "error"
        connection.error = err instanceof Error ? err.message : String(err)
        reject(err)
      }
    })
  }

  public async disconnect(hostId: string): Promise<boolean> {
    const conn = this.activeConnections.get(hostId)
    if (!conn) return false

    if (conn.controlSocket && fs.existsSync(conn.controlSocket)) {
      try {
        spawn("ssh", ["-O", "exit", "-S", conn.controlSocket, conn.host])
      } catch {}
    }

    if (conn.process) {
      try {
        conn.process.kill("SIGTERM")
      } catch {}
    }

    conn.status = "disconnected"
    this.activeConnections.delete(hostId)
    return true
  }

  public getStatus(): SSHStatusResponse {
    const active: SSHStatusResponse["activeConnections"] = []
    for (const conn of this.activeConnections.values()) {
      active.push({
        hostId: conn.hostId,
        host: conn.host,
        hostName: conn.hostName,
        user: conn.user,
        port: conn.port,
        localPort: conn.localPort,
        status: conn.status,
        connectedAt: conn.connectedAt,
        remoteOS: conn.remoteOS,
        error: conn.error,
      })
    }
    return { activeConnections: active }
  }
}

export class SSHService extends Context.Service<SSHService, SSHManager>()("@opencode/SSHManager") {}

export const SSHServiceLive = Layer.sync(SSHService, () => new SSHManager())

