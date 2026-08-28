import { describe, expect, test } from "bun:test"
import { GitManager } from "../../src/git/manager"

describe("Git Manager Engine", () => {
  const git = new GitManager()

  test("retrieves repository branch and status", async () => {
    const status = await git.getStatus()
    expect(status).toBeDefined()
    expect(typeof status.branch).toBe("string")
    expect(Array.isArray(status.staged)).toBe(true)
    expect(Array.isArray(status.unstaged)).toBe(true)
    expect(Array.isArray(status.untracked)).toBe(true)
  })

  test("retrieves branch listings", async () => {
    const branches = await git.getBranches()
    expect(branches).toBeDefined()
    expect(typeof branches.current).toBe("string")
    expect(Array.isArray(branches.all)).toBe(true)
    expect(branches.all.length).toBeGreaterThan(0)
  })
})
