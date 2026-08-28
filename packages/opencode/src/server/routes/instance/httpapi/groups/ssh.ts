import { NonNegativeInt } from "@opencode-ai/core/schema"
import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { Authorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"
import {
  WorkspaceRoutingMiddleware,
  WorkspaceRoutingQuery,
} from "../middleware/workspace-routing"
import { described } from "./metadata"

export const SSHHostSchema = Schema.Struct({
  id: Schema.String,
  host: Schema.String,
  hostName: Schema.String,
  label: Schema.optional(Schema.String),
  user: Schema.optional(Schema.String),
  port: Schema.optional(NonNegativeInt),
  identityFile: Schema.optional(Schema.Array(Schema.String)),
  proxyJump: Schema.optional(Schema.String),
  forwardAgent: Schema.optional(Schema.Boolean),
  source: Schema.Literals(["config", "custom"]),
  lastConnected: Schema.optional(Schema.Number),
  defaultDirectory: Schema.optional(Schema.String),
}).annotate({ identifier: "SSHHost" })

export const SaveSSHHostPayload = Schema.Struct({
  id: Schema.String,
  host: Schema.String,
  hostName: Schema.String,
  label: Schema.optional(Schema.String),
  user: Schema.optional(Schema.String),
  port: Schema.optional(NonNegativeInt),
  identityFile: Schema.optional(Schema.Array(Schema.String)),
  proxyJump: Schema.optional(Schema.String),
  forwardAgent: Schema.optional(Schema.Boolean),
  defaultDirectory: Schema.optional(Schema.String),
}).annotate({ identifier: "SaveSSHHostPayload" })

export const SSHConnectPayload = Schema.Struct({
  hostId: Schema.String,
  password: Schema.optional(Schema.String),
  passphrase: Schema.optional(Schema.String),
}).annotate({ identifier: "SSHConnectPayload" })

export const SSHDisconnectPayload = Schema.Struct({
  hostId: Schema.String,
}).annotate({ identifier: "SSHDisconnectPayload" })

export const SSHActiveConnectionSchema = Schema.Struct({
  hostId: Schema.String,
  host: Schema.String,
  hostName: Schema.String,
  user: Schema.String,
  port: NonNegativeInt,
  localPort: NonNegativeInt,
  status: Schema.String,
  connectedAt: Schema.optional(Schema.Number),
  remoteOS: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
}).annotate({ identifier: "SSHActiveConnection" })

export const SSHStatusSchema = Schema.Struct({
  activeConnections: Schema.Array(SSHActiveConnectionSchema),
}).annotate({ identifier: "SSHStatus" })

export const SshPaths = {
  hosts: "/ssh/hosts",
  saveHost: "/ssh/hosts",
  removeHost: "/ssh/hosts/:id",
  connect: "/ssh/connect",
  disconnect: "/ssh/disconnect",
  status: "/ssh/status",
} as const

export const SshApi = HttpApi.make("ssh")
  .add(
    HttpApiGroup.make("ssh")
      .add(
        HttpApiEndpoint.get("hosts", SshPaths.hosts, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(SSHHostSchema), "List SSH hosts"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "ssh.hosts",
            summary: "List SSH hosts",
            description: "Get all saved and discovered ~/.ssh/config hosts.",
          }),
        ),
        HttpApiEndpoint.post("saveHost", SshPaths.saveHost, {
          payload: SaveSSHHostPayload,
          query: WorkspaceRoutingQuery,
          success: described(SSHHostSchema, "Saved SSH host"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "ssh.saveHost",
            summary: "Save SSH host",
            description: "Create or update custom SSH host configuration.",
          }),
        ),
        HttpApiEndpoint.delete("removeHost", SshPaths.removeHost, {
          params: { id: Schema.String },
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Host removed"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "ssh.removeHost",
            summary: "Remove SSH host",
            description: "Delete a custom SSH host configuration.",
          }),
        ),
        HttpApiEndpoint.post("connect", SshPaths.connect, {
          payload: SSHConnectPayload,
          query: WorkspaceRoutingQuery,
          success: described(SSHActiveConnectionSchema, "Connected SSH session"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "ssh.connect",
            summary: "Connect SSH host",
            description: "Establish a persistent SSH tunnel and remote workspace session.",
          }),
        ),
        HttpApiEndpoint.post("disconnect", SshPaths.disconnect, {
          payload: SSHDisconnectPayload,
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Disconnected"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "ssh.disconnect",
            summary: "Disconnect SSH host",
            description: "Terminate the active persistent SSH tunnel.",
          }),
        ),
        HttpApiEndpoint.get("status", SshPaths.status, {
          query: WorkspaceRoutingQuery,
          success: described(SSHStatusSchema, "SSH status"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "ssh.status",
            summary: "Get SSH status",
            description: "Get active SSH tunnels and connection states.",
          }),
        ),
      )
      .annotateMerge(
        OpenApi.annotations({
          title: "ssh",
          description: "Remote SSH HttpApi routes.",
        }),
      )
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(Authorization),
  )
