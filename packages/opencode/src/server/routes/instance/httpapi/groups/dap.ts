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

export const DAPBreakpointSchema = Schema.Struct({
  id: Schema.String,
  file: Schema.String,
  line: NonNegativeInt,
  verified: Schema.Boolean,
  condition: Schema.optional(Schema.String),
}).annotate({ identifier: "DAPBreakpoint" })

export const DAPStackFrameSchema = Schema.Struct({
  id: NonNegativeInt,
  name: Schema.String,
  file: Schema.String,
  line: NonNegativeInt,
  column: NonNegativeInt,
}).annotate({ identifier: "DAPStackFrame" })

export const DAPVariableSchema = Schema.Struct({
  name: Schema.String,
  value: Schema.String,
  type: Schema.optional(Schema.String),
  variablesReference: NonNegativeInt,
}).annotate({ identifier: "DAPVariable" })

export const DAPLaunchConfigPayload = Schema.Struct({
  name: Schema.String,
  type: Schema.Literals(["node", "bun", "python", "custom"]),
  request: Schema.Literals(["launch", "attach"]),
  program: Schema.optional(Schema.String),
  args: Schema.optional(Schema.Array(Schema.String)),
  cwd: Schema.optional(Schema.String),
  port: Schema.optional(NonNegativeInt),
}).annotate({ identifier: "DAPLaunchConfigPayload" })

export const DAPSessionSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  status: Schema.Literals(["initializing", "running", "stopped", "terminated"]),
  stopReason: Schema.optional(Schema.Literals(["breakpoint", "step", "pause", "exception"])),
  currentFrame: Schema.optional(DAPStackFrameSchema),
}).annotate({ identifier: "DAPSession" })

export const DapApi = HttpApi.make("dap")
  .add(
    HttpApiGroup.make("dap")
      .add(
        HttpApiEndpoint.get("sessions", "/dap/sessions", {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(DAPSessionSchema), "Active debug sessions"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "dap.sessions",
            summary: "List debug sessions",
            description: "Get all active DAP debug sessions.",
          }),
        ),
        HttpApiEndpoint.post("start", "/dap/start", {
          payload: DAPLaunchConfigPayload,
          query: WorkspaceRoutingQuery,
          success: described(DAPSessionSchema, "Started debug session"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "dap.start",
            summary: "Start debugging",
            description: "Launch or attach to a debug process.",
          }),
        ),
        HttpApiEndpoint.post("stop", "/dap/stop", {
          payload: Schema.Struct({ sessionId: Schema.String }),
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Stop result"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "dap.stop",
            summary: "Stop debugging",
            description: "Terminate the active debug session.",
          }),
        ),
        HttpApiEndpoint.post("setBreakpoints", "/dap/breakpoints", {
          payload: Schema.Struct({
            file: Schema.String,
            lines: Schema.Array(NonNegativeInt),
          }),
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(DAPBreakpointSchema), "Set breakpoints"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "dap.setBreakpoints",
            summary: "Set breakpoints",
            description: "Configure breakpoints for a file in the workspace.",
          }),
        ),
        HttpApiEndpoint.get("getBreakpoints", "/dap/breakpoints", {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(DAPBreakpointSchema), "List breakpoints"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "dap.getBreakpoints",
            summary: "Get breakpoints",
            description: "List all registered breakpoints.",
          }),
        ),
        HttpApiEndpoint.post("resume", "/dap/resume", {
          payload: Schema.Struct({ sessionId: Schema.String }),
          query: WorkspaceRoutingQuery,
          success: described(DAPSessionSchema, "Resumed session"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "dap.resume",
            summary: "Resume execution",
            description: "Continue execution of paused debug session.",
          }),
        ),
        HttpApiEndpoint.post("stepOver", "/dap/stepOver", {
          payload: Schema.Struct({ sessionId: Schema.String }),
          query: WorkspaceRoutingQuery,
          success: described(DAPSessionSchema, "Stepped session"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "dap.stepOver",
            summary: "Step over",
            description: "Step over next line of execution.",
          }),
        ),
        HttpApiEndpoint.post("stepIn", "/dap/stepIn", {
          payload: Schema.Struct({ sessionId: Schema.String }),
          query: WorkspaceRoutingQuery,
          success: described(DAPSessionSchema, "Stepped in session"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "dap.stepIn",
            summary: "Step into",
            description: "Step into function call.",
          }),
        ),
        HttpApiEndpoint.post("stepOut", "/dap/stepOut", {
          payload: Schema.Struct({ sessionId: Schema.String }),
          query: WorkspaceRoutingQuery,
          success: described(DAPSessionSchema, "Stepped out session"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "dap.stepOut",
            summary: "Step out",
            description: "Step out of current function scope.",
          }),
        ),
        HttpApiEndpoint.post("pause", "/dap/pause", {
          payload: Schema.Struct({ sessionId: Schema.String }),
          query: WorkspaceRoutingQuery,
          success: described(DAPSessionSchema, "Paused session"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "dap.pause",
            summary: "Pause execution",
            description: "Pause running debug target.",
          }),
        ),
        HttpApiEndpoint.get("stackTrace", "/dap/stackTrace", {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(DAPStackFrameSchema), "Stack trace"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "dap.stackTrace",
            summary: "Get stack trace",
            description: "Get call stack frames for active session.",
          }),
        ),
        HttpApiEndpoint.get("variables", "/dap/variables", {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(DAPVariableSchema), "Variables"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "dap.variables",
            summary: "Get variables",
            description: "Inspect variables for a given scope reference.",
          }),
        ),
        HttpApiEndpoint.post("evaluate", "/dap/evaluate", {
          payload: Schema.Struct({
            sessionId: Schema.String,
            expression: Schema.String,
          }),
          query: WorkspaceRoutingQuery,
          success: described(
            Schema.Struct({
              result: Schema.String,
              type: Schema.String,
            }),
            "Evaluation result",
          ),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "dap.evaluate",
            summary: "Evaluate expression",
            description: "Evaluate expression in current debug context.",
          }),
        ),
      )
      .annotateMerge(
        OpenApi.annotations({
          title: "dap",
          description: "Debug Adapter Protocol HttpApi routes.",
        }),
      )
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(Authorization),
  )
