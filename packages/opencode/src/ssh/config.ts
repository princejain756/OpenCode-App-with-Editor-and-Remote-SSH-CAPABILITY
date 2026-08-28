import fs from "fs"
import path from "path"
import os from "os"

export interface SSHHostConfig {
  id: string
  host: string
  hostName: string
  user?: string
  port?: number
  identityFile?: string[]
  proxyJump?: string
  forwardAgent?: boolean
  source: "config" | "custom"
}

export function parseSSHConfigFile(customPath?: string): SSHHostConfig[] {
  const configPath = customPath ?? path.join(os.homedir(), ".ssh", "config")
  if (!fs.existsSync(configPath)) {
    return []
  }

  try {
    const content = fs.readFileSync(configPath, "utf8")
    const lines = content.split(/\r?\n/)
    const hosts: SSHHostConfig[] = []

    let currentHost: Partial<SSHHostConfig> | null = null

    for (let line of lines) {
      line = line.trim()
      if (!line || line.startsWith("#")) continue

      const parts = line.split(/\s+/)
      const key = parts[0].toLowerCase()
      const value = parts.slice(1).join(" ").trim()

      if (key === "host") {
        if (currentHost && currentHost.host && currentHost.host !== "*") {
          hosts.push({
            id: `ssh-config-${currentHost.host}`,
            host: currentHost.host,
            hostName: currentHost.hostName ?? currentHost.host,
            user: currentHost.user,
            port: currentHost.port,
            identityFile: currentHost.identityFile,
            proxyJump: currentHost.proxyJump,
            forwardAgent: currentHost.forwardAgent,
            source: "config",
          })
        }

        // Ignore wildcard match hosts for list, or use as defaults
        if (value !== "*") {
          currentHost = {
            host: value,
            identityFile: [],
          }
        } else {
          currentHost = null
        }
      } else if (currentHost) {
        if (key === "hostname") {
          currentHost.hostName = value
        } else if (key === "user") {
          currentHost.user = value
        } else if (key === "port") {
          const p = parseInt(value, 10)
          if (!isNaN(p)) currentHost.port = p
        } else if (key === "identityfile") {
          currentHost.identityFile = currentHost.identityFile ?? []
          currentHost.identityFile.push(value.replace(/^~/, os.homedir()))
        } else if (key === "proxyjump") {
          currentHost.proxyJump = value
        } else if (key === "forwardagent") {
          currentHost.forwardAgent = value.toLowerCase() === "yes"
        }
      }
    }

    if (currentHost && currentHost.host && currentHost.host !== "*") {
      hosts.push({
        id: `ssh-config-${currentHost.host}`,
        host: currentHost.host,
        hostName: currentHost.hostName ?? currentHost.host,
        user: currentHost.user,
        port: currentHost.port,
        identityFile: currentHost.identityFile,
        proxyJump: currentHost.proxyJump,
        forwardAgent: currentHost.forwardAgent,
        source: "config",
      })
    }

    return hosts
  } catch (err) {
    console.error("[ssh] Error parsing SSH config:", err)
    return []
  }
}
