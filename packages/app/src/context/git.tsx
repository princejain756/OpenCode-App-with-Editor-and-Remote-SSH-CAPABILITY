import { batch, createEffect, createSignal } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { useSDK } from "./sdk"
import { useServerSDK } from "./server-sdk"
import { showToast } from "@/utils/toast"

export interface GitFileChange {
  path: string
  status: "modified" | "added" | "deleted" | "untracked" | "renamed"
  staged: boolean
}

export interface GitStatusState {
  branch: string
  clean: boolean
  ahead: number
  behind: number
  staged: GitFileChange[]
  unstaged: GitFileChange[]
  untracked: string[]
}

export const { use: useGit, provider: GitProvider } = createSimpleContext({
  name: "Git",
  gate: false,
  init: () => {
    const sdk = useSDK()
    const serverSDK = useServerSDK()

    const [status, setStatus] = createStore<GitStatusState>({
      branch: "main",
      clean: true,
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
    })

    const [branches, setBranches] = createStore<{ current: string; all: string[] }>({
      current: "main",
      all: ["main"],
    })

    const [isLoading, setIsLoading] = createSignal(false)
    const [isOperating, setIsOperating] = createSignal(false)

    const fetchStatus = async () => {
      try {
        setIsLoading(true)
        const client = serverSDK().client as any
        let result: GitStatusState | undefined

        if (client.git?.status) {
          const res = await client.git.status()
          result = res.data
        } else {
          const url = `${serverSDK().url}/git/status`
          const res = await fetch(url)
          if (res.ok) result = await res.json()
        }

        if (result) {
          setStatus(reconcile(result))
        }
      } catch (err) {
        console.error("[git] Failed to fetch git status:", err)
      } finally {
        setIsLoading(false)
      }
    }

    const fetchBranches = async () => {
      try {
        const client = serverSDK().client as any
        let result: { current: string; all: string[] } | undefined

        if (client.git?.branches) {
          const res = await client.git.branches()
          result = res.data
        } else {
          const url = `${serverSDK().url}/git/branches`
          const res = await fetch(url)
          if (res.ok) result = await res.json()
        }

        if (result) {
          setBranches(reconcile(result))
        }
      } catch (err) {
        console.error("[git] Failed to fetch git branches:", err)
      }
    }

    createEffect(() => {
      const dir = sdk().directory
      if (dir) {
        void fetchStatus()
        void fetchBranches()
      }
    })

    const stage = async (paths: string[]) => {
      try {
        setIsOperating(true)
        const client = serverSDK().client as any
        if (client.git?.stage) {
          await client.git.stage({ paths })
        } else {
          const url = `${serverSDK().url}/git/stage`
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paths }),
          })
        }
        await fetchStatus()
        return true
      } catch (err) {
        showToast({
          variant: "error",
          title: "Stage Failed",
          description: err instanceof Error ? err.message : String(err),
        })
        return false
      } finally {
        setIsOperating(false)
      }
    }

    const unstage = async (paths: string[]) => {
      try {
        setIsOperating(true)
        const client = serverSDK().client as any
        if (client.git?.unstage) {
          await client.git.unstage({ paths })
        } else {
          const url = `${serverSDK().url}/git/unstage`
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paths }),
          })
        }
        await fetchStatus()
        return true
      } catch (err) {
        showToast({
          variant: "error",
          title: "Unstage Failed",
          description: err instanceof Error ? err.message : String(err),
        })
        return false
      } finally {
        setIsOperating(false)
      }
    }

    const commit = async (message: string) => {
      if (!message.trim()) return false
      try {
        setIsOperating(true)
        const client = serverSDK().client as any
        let resData: { success: boolean; hash?: string; error?: string } | undefined

        if (client.git?.commit) {
          const res = await client.git.commit({ message })
          resData = res.data
        } else {
          const url = `${serverSDK().url}/git/commit`
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
          })
          if (res.ok) resData = await res.json()
        }

        if (resData?.success) {
          showToast({
            variant: "success",
            title: "Committed",
            description: resData.hash ? `Commit ${resData.hash} created.` : "Changes committed.",
          })
          await fetchStatus()
          return true
        } else {
          showToast({
            variant: "error",
            title: "Commit Failed",
            description: resData?.error ?? "Unknown error committing changes.",
          })
          return false
        }
      } catch (err) {
        showToast({
          variant: "error",
          title: "Commit Failed",
          description: err instanceof Error ? err.message : String(err),
        })
        return false
      } finally {
        setIsOperating(false)
      }
    }

    const checkout = async (branch: string, create = false) => {
      try {
        setIsOperating(true)
        const client = serverSDK().client as any
        let resData: { success: boolean; error?: string } | undefined

        if (client.git?.checkout) {
          const res = await client.git.checkout({ branch, create })
          resData = res.data
        } else {
          const url = `${serverSDK().url}/git/checkout`
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ branch, create }),
          })
          if (res.ok) resData = await res.json()
        }

        if (resData?.success) {
          showToast({
            variant: "success",
            title: "Branch Switched",
            description: `Now on branch ${branch}.`,
          })
          await fetchStatus()
          await fetchBranches()
          return true
        } else {
          showToast({
            variant: "error",
            title: "Checkout Failed",
            description: resData?.error ?? "Failed to checkout branch.",
          })
          return false
        }
      } catch (err) {
        showToast({
          variant: "error",
          title: "Checkout Failed",
          description: err instanceof Error ? err.message : String(err),
        })
        return false
      } finally {
        setIsOperating(false)
      }
    }

    const pull = async () => {
      try {
        setIsOperating(true)
        const client = serverSDK().client as any
        let resData: { success: boolean; output: string } | undefined

        if (client.git?.pull) {
          const res = await client.git.pull()
          resData = res.data
        } else {
          const url = `${serverSDK().url}/git/pull`
          const res = await fetch(url, { method: "POST" })
          if (res.ok) resData = await res.json()
        }

        if (resData?.success) {
          showToast({
            variant: "success",
            title: "Git Pull",
            description: resData.output || "Already up to date.",
          })
          await fetchStatus()
          return true
        } else {
          showToast({
            variant: "error",
            title: "Pull Failed",
            description: resData?.output ?? "Failed to pull from remote.",
          })
          return false
        }
      } catch (err) {
        showToast({
          variant: "error",
          title: "Pull Failed",
          description: err instanceof Error ? err.message : String(err),
        })
        return false
      } finally {
        setIsOperating(false)
      }
    }

    const push = async () => {
      try {
        setIsOperating(true)
        const client = serverSDK().client as any
        let resData: { success: boolean; output: string } | undefined

        if (client.git?.push) {
          const res = await client.git.push()
          resData = res.data
        } else {
          const url = `${serverSDK().url}/git/push`
          const res = await fetch(url, { method: "POST" })
          if (res.ok) resData = await res.json()
        }

        if (resData?.success) {
          showToast({
            variant: "success",
            title: "Git Push",
            description: "Pushed commits to upstream.",
          })
          await fetchStatus()
          return true
        } else {
          showToast({
            variant: "error",
            title: "Push Failed",
            description: resData?.output ?? "Failed to push to remote.",
          })
          return false
        }
      } catch (err) {
        showToast({
          variant: "error",
          title: "Push Failed",
          description: err instanceof Error ? err.message : String(err),
        })
        return false
      } finally {
        setIsOperating(false)
      }
    }

    const discard = async (paths: string[]) => {
      try {
        setIsOperating(true)
        const client = serverSDK().client as any
        if (client.git?.discard) {
          await client.git.discard({ paths })
        } else {
          const url = `${serverSDK().url}/git/discard`
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paths }),
          })
        }

        showToast({
          variant: "success",
          title: "Changes Discarded",
          description: `Discarded modifications in ${paths.length} file(s).`,
        })
        await fetchStatus()
        return true
      } catch (err) {
        showToast({
          variant: "error",
          title: "Discard Failed",
          description: err instanceof Error ? err.message : String(err),
        })
        return false
      } finally {
        setIsOperating(false)
      }
    }

    return {
      status,
      branches,
      isLoading,
      isOperating,
      currentBranch: () => status.branch,
      fetchStatus,
      fetchBranches,
      stage,
      unstage,
      commit,
      checkout,
      pull,
      push,
      discard,
    }
  },
})
