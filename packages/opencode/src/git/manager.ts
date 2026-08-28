import { spawn } from "child_process"
import { Context, Layer } from "effect"

export interface GitFileStatus {
  path: string
  status: "modified" | "added" | "deleted" | "untracked" | "renamed"
  staged: boolean
}

export interface GitStatusResult {
  branch: string
  clean: boolean
  ahead: number
  behind: number
  staged: GitFileStatus[]
  unstaged: GitFileStatus[]
  untracked: string[]
}

export interface GitBranchResult {
  current: string
  all: string[]
}

export class GitManager {
  private runGit(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const proc = spawn("git", args, {
        cwd: cwd || process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
      })

      let stdout = ""
      let stderr = ""

      proc.stdout.on("data", (d) => {
        stdout += d.toString()
      })
      proc.stderr.on("data", (d) => {
        stderr += d.toString()
      })

      proc.on("error", reject)
      proc.on("close", (exitCode) => {
        resolve({ stdout, stderr, exitCode: exitCode ?? 0 })
      })
    })
  }

  public async getStatus(cwd?: string): Promise<GitStatusResult> {
    try {
      const branchRes = await this.runGit(["branch", "--show-current"], cwd)
      const branch = branchRes.stdout.trim() || "HEAD"

      const statusRes = await this.runGit(["status", "--porcelain=v1", "-b"], cwd)
      const lines = statusRes.stdout.split(/\r?\n/).filter((l) => l.length > 0)

      let ahead = 0
      let behind = 0
      const staged: GitFileStatus[] = []
      const unstaged: GitFileStatus[] = []
      const untracked: string[] = []

      for (const line of lines) {
        if (line.startsWith("##")) {
          const aheadMatch = line.match(/ahead\s+(\d+)/)
          const behindMatch = line.match(/behind\s+(\d+)/)
          if (aheadMatch) ahead = parseInt(aheadMatch[1], 10)
          if (behindMatch) behind = parseInt(behindMatch[1], 10)
          continue
        }

        const x = line[0]
        const y = line[1]
        const filePath = line.slice(3).trim()

        if (x === "?" && y === "?") {
          untracked.push(filePath)
          unstaged.push({ path: filePath, status: "untracked", staged: false })
          continue
        }

        // Staged changes (X)
        if (x !== " " && x !== "?") {
          const status = x === "A" ? "added" : x === "D" ? "deleted" : x === "R" ? "renamed" : "modified"
          staged.push({ path: filePath, status, staged: true })
        }

        // Unstaged changes (Y)
        if (y !== " " && y !== "?") {
          const status = y === "D" ? "deleted" : "modified"
          unstaged.push({ path: filePath, status, staged: false })
        }
      }

      return {
        branch,
        clean: staged.length === 0 && unstaged.length === 0,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
      }
    } catch (err) {
      return {
        branch: "main",
        clean: true,
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
        untracked: [],
      }
    }
  }

  public async stage(paths: string[], cwd?: string): Promise<boolean> {
    const res = await this.runGit(["add", "--", ...paths], cwd)
    return res.exitCode === 0
  }

  public async unstage(paths: string[], cwd?: string): Promise<boolean> {
    const res = await this.runGit(["reset", "HEAD", "--", ...paths], cwd)
    return res.exitCode === 0
  }

  public async commit(message: string, cwd?: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    const res = await this.runGit(["commit", "-m", message], cwd)
    if (res.exitCode === 0) {
      const match = res.stdout.match(/\[(?:\w+)\s+([a-f0-9]+)\]/)
      return { success: true, hash: match ? match[1] : undefined }
    }
    return { success: false, error: res.stderr || res.stdout }
  }

  public async getBranches(cwd?: string): Promise<GitBranchResult> {
    const res = await this.runGit(["branch", "--list"], cwd)
    const lines = res.stdout.split(/\r?\n/).filter((l) => l.trim().length > 0)

    let current = "main"
    const all: string[] = []

    for (const line of lines) {
      const clean = line.replace(/^\*/, "").trim()
      all.push(clean)
      if (line.startsWith("*")) {
        current = clean
      }
    }

    return { current, all }
  }

  public async checkout(branch: string, create = false, cwd?: string): Promise<{ success: boolean; error?: string }> {
    const args = create ? ["checkout", "-b", branch] : ["checkout", branch]
    const res = await this.runGit(args, cwd)
    return { success: res.exitCode === 0, error: res.exitCode === 0 ? undefined : res.stderr }
  }

  public async pull(cwd?: string): Promise<{ success: boolean; output: string }> {
    const res = await this.runGit(["pull"], cwd)
    return { success: res.exitCode === 0, output: res.stdout || res.stderr }
  }

  public async push(cwd?: string): Promise<{ success: boolean; output: string }> {
    const res = await this.runGit(["push"], cwd)
    return { success: res.exitCode === 0, output: res.stdout || res.stderr }
  }

  public async discard(paths: string[], cwd?: string): Promise<boolean> {
    const res = await this.runGit(["checkout", "--", ...paths], cwd)
    return res.exitCode === 0
  }
}

export class GitService extends Context.Service<GitService, GitManager>()("@opencode/GitManager") {}

export const GitServiceLive = Layer.sync(GitService, () => new GitManager())
