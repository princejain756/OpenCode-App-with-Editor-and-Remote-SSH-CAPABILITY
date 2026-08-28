import { describe, expect, test } from "bun:test"
import { parseSSHConfigFile } from "../../src/ssh/config"
import fs from "fs"
import path from "path"
import os from "os"

describe("SSH Config Parser & Host Management", () => {
  test("parses multi-host ssh config with ports, users, keys, and proxy jumps", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ssh-test-"))
    const configPath = path.join(tmpDir, "config")

    const sampleConfig = `
Host dev-ubuntu
    HostName 192.168.1.105
    User ubuntu
    Port 2222
    IdentityFile ~/.ssh/id_ed25519
    ForwardAgent yes

Host aws-prod
    HostName ec2-54-123-45-67.compute-1.amazonaws.com
    User ec2-user
    Port 22
    IdentityFile ~/.ssh/prod-key.pem
    ProxyJump bastion.example.com

Host *
    ServerAliveInterval 60
`

    fs.writeFileSync(configPath, sampleConfig, "utf8")

    const parsed = parseSSHConfigFile(configPath)

    expect(parsed).toHaveLength(2)

    const devHost = parsed.find((h) => h.host === "dev-ubuntu")
    expect(devHost).toBeDefined()
    expect(devHost?.hostName).toBe("192.168.1.105")
    expect(devHost?.user).toBe("ubuntu")
    expect(devHost?.port).toBe(2222)
    expect(devHost?.forwardAgent).toBe(true)

    const prodHost = parsed.find((h) => h.host === "aws-prod")
    expect(prodHost).toBeDefined()
    expect(prodHost?.hostName).toBe("ec2-54-123-45-67.compute-1.amazonaws.com")
    expect(prodHost?.user).toBe("ec2-user")
    expect(prodHost?.proxyJump).toBe("bastion.example.com")

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  test("handles empty or missing ssh config gracefully", () => {
    const parsed = parseSSHConfigFile("/non/existent/path/config")
    expect(parsed).toEqual([])
  })
})
