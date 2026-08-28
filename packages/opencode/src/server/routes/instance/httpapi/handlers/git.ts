import { GitManager, GitService } from "@/git/manager"
import { Effect, Layer } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"

export const gitHandlers = HttpApiBuilder.group(InstanceHttpApi, "git", (handlers) =>
  Effect.gen(function* () {
    const git = yield* GitService

    const status = Effect.fn("GitHttpApi.status")(function* (ctx: {
      query?: { directory?: string }
    }) {
      const cwd = ctx.query?.directory
      return yield* Effect.promise(() => git.getStatus(cwd))
    })

    const stage = Effect.fn("GitHttpApi.stage")(function* (ctx: {
      payload: { paths: readonly string[] }
      query?: { directory?: string }
    }) {
      const cwd = ctx.query?.directory
      return yield* Effect.promise(() => git.stage(Array.from(ctx.payload.paths), cwd))
    })

    const unstage = Effect.fn("GitHttpApi.unstage")(function* (ctx: {
      payload: { paths: readonly string[] }
      query?: { directory?: string }
    }) {
      const cwd = ctx.query?.directory
      return yield* Effect.promise(() => git.unstage(Array.from(ctx.payload.paths), cwd))
    })

    const commit = Effect.fn("GitHttpApi.commit")(function* (ctx: {
      payload: { message: string }
      query?: { directory?: string }
    }) {
      const cwd = ctx.query?.directory
      return yield* Effect.promise(() => git.commit(ctx.payload.message, cwd))
    })

    const branches = Effect.fn("GitHttpApi.branches")(function* (ctx: {
      query?: { directory?: string }
    }) {
      const cwd = ctx.query?.directory
      return yield* Effect.promise(() => git.getBranches(cwd))
    })

    const checkout = Effect.fn("GitHttpApi.checkout")(function* (ctx: {
      payload: { branch: string; create?: boolean }
      query?: { directory?: string }
    }) {
      const cwd = ctx.query?.directory
      return yield* Effect.promise(() => git.checkout(ctx.payload.branch, ctx.payload.create, cwd))
    })

    const pull = Effect.fn("GitHttpApi.pull")(function* (ctx: {
      query?: { directory?: string }
    }) {
      const cwd = ctx.query?.directory
      return yield* Effect.promise(() => git.pull(cwd))
    })

    const push = Effect.fn("GitHttpApi.push")(function* (ctx: {
      query?: { directory?: string }
    }) {
      const cwd = ctx.query?.directory
      return yield* Effect.promise(() => git.push(cwd))
    })

    const discard = Effect.fn("GitHttpApi.discard")(function* (ctx: {
      payload: { paths: readonly string[] }
      query?: { directory?: string }
    }) {
      const cwd = ctx.query?.directory
      return yield* Effect.promise(() => git.discard(Array.from(ctx.payload.paths), cwd))
    })

    return handlers
      .handle("status", status)
      .handle("stage", stage)
      .handle("unstage", unstage)
      .handle("commit", commit)
      .handle("branches", branches)
      .handle("checkout", checkout)
      .handle("pull", pull)
      .handle("push", push)
      .handle("discard", discard)
  }),
)
