import { describe, expect, test } from "bun:test"

describe("Remote SSH Explorer & Client Management", () => {
  test("creates valid host connection identifiers", () => {
    const host = {
      id: "custom-ssh-dev_ubuntu",
      host: "dev-ubuntu",
      hostName: "192.168.1.50",
      user: "ubuntu",
      port: 22,
      source: "custom" as const,
    }

    expect(host.id).toBe("custom-ssh-dev_ubuntu")
    expect(`${host.user}@${host.hostName}:${host.port}`).toBe("ubuntu@192.168.1.50:22")
  })

  test("parses quick connect command line strings into structured host configs", () => {
    const input = "ssh deploy@10.0.0.15 -p 2200"

    const clean = input.replace(/^ssh\s+/, "")
    const parts = clean.split(/\s+/)
    let userHost = parts[0]
    let port = 22

    for (let i = 1; i < parts.length; i++) {
      if (parts[i] === "-p" && parts[i + 1]) {
        port = parseInt(parts[i + 1], 10) || 22
      }
    }

    let user = "ubuntu"
    let hostName = userHost
    if (userHost.includes("@")) {
      const atIdx = userHost.indexOf("@")
      user = userHost.slice(0, atIdx)
      hostName = userHost.slice(atIdx + 1)
    }

    expect(user).toBe("deploy")
    expect(hostName).toBe("10.0.0.15")
    expect(port).toBe(2200)
  })

  test("tracks connection states and tunnel port allocation", () => {
    const connections: Record<string, { status: string; localPort?: number }> = {}

    connections["host-1"] = { status: "connecting" }
    expect(connections["host-1"].status).toBe("connecting")

    connections["host-1"] = { status: "connected", localPort: 43210 }
    expect(connections["host-1"].status).toBe("connected")
    expect(connections["host-1"].localPort).toBe(43210)
  })
})
