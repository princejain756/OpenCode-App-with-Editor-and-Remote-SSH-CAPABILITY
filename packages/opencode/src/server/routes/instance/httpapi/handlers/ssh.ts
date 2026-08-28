import { SSHManager, SSHService } from "@/ssh/manager"
import { Effect, Layer } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"

export const sshHandlers = HttpApiBuilder.group(InstanceHttpApi, "ssh", (handlers) =>
  Effect.gen(function* () {
    const manager = yield* SSHService

    const hosts = Effect.fn("SshHttpApi.hosts")(function* () {
      const list = manager.getAllHosts()
      return list.map((h) => ({
        id: h.id,
        host: h.host,
        hostName: h.hostName,
        label: h.label,
        user: h.user,
        port: h.port,
        identityFile: h.identityFile,
        proxyJump: h.proxyJump,
        forwardAgent: h.forwardAgent,
        source: h.source,
        lastConnected: h.lastConnected,
        defaultDirectory: h.defaultDirectory,
      }))
    })

    const saveHost = Effect.fn("SshHttpApi.saveHost")(function* (ctx: {
      payload: {
        id: string
        host: string
        hostName: string
        label?: string
        user?: string
        port?: number
        identityFile?: readonly string[]
        proxyJump?: string
        forwardAgent?: boolean
        defaultDirectory?: string
      }
    }) {
      const saved = manager.saveHost({
        id: ctx.payload.id,
        host: ctx.payload.host,
        hostName: ctx.payload.hostName,
        label: ctx.payload.label,
        user: ctx.payload.user,
        port: ctx.payload.port,
        identityFile: ctx.payload.identityFile ? Array.from(ctx.payload.identityFile) : undefined,
        proxyJump: ctx.payload.proxyJump,
        forwardAgent: ctx.payload.forwardAgent,
        defaultDirectory: ctx.payload.defaultDirectory,
      })

      return {
        id: saved.id,
        host: saved.host,
        hostName: saved.hostName,
        label: saved.label,
        user: saved.user,
        port: saved.port,
        identityFile: saved.identityFile,
        proxyJump: saved.proxyJump,
        forwardAgent: saved.forwardAgent,
        source: saved.source,
        lastConnected: saved.lastConnected,
        defaultDirectory: saved.defaultDirectory,
      }
    })

    const removeHost = Effect.fn("SshHttpApi.removeHost")(function* (ctx: {
      params: { id: string }
    }) {
      return manager.removeHost(ctx.params.id)
    })

    const connect = Effect.fn("SshHttpApi.connect")(function* (ctx: {
      payload: { hostId: string; password?: string; passphrase?: string }
    }) {
      const active = yield* Effect.promise(() => manager.connect(ctx.payload.hostId))

      return {
        hostId: active.hostId,
        host: active.host,
        hostName: active.hostName,
        user: active.user,
        port: active.port,
        localPort: active.localPort,
        status: active.status,
        connectedAt: active.connectedAt,
        remoteOS: active.remoteOS,
        error: active.error,
      }
    })

    const disconnect = Effect.fn("SshHttpApi.disconnect")(function* (ctx: {
      payload: { hostId: string }
    }) {
      return yield* Effect.promise(() => manager.disconnect(ctx.payload.hostId))
    })

    const bootstrap = Effect.fn("SshHttpApi.bootstrap")(function* (ctx: {
      payload: { hostId: string; workspaceDir?: string }
    }) {
      return yield* Effect.promise(() =>
        manager.bootstrapRemoteServer(ctx.payload.hostId, ctx.payload.workspaceDir),
      )
    })

    const exec = Effect.fn("SshHttpApi.exec")(function* (ctx: {
      payload: { hostId: string; command: string }
    }) {
      return yield* Effect.promise(() =>
        manager.execRemoteCommand(ctx.payload.hostId, ctx.payload.command),
      )
    })

    const status = Effect.fn("SshHttpApi.status")(function* () {
      return manager.getStatus()
    })

    return handlers
      .handle("hosts", hosts)
      .handle("saveHost", saveHost)
      .handle("removeHost", removeHost)
      .handle("connect", connect)
      .handle("disconnect", disconnect)
      .handle("bootstrap", bootstrap)
      .handle("exec", exec)
      .handle("status", status)
  }),
)
