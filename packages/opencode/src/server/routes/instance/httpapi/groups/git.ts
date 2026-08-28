import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { Authorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"
import {
  WorkspaceRoutingMiddleware,
  WorkspaceRoutingQuery,
} from "../middleware/workspace-routing"
import { described } from "./metadata"

export const GitFileStatusSchema = Schema.Struct({
  path: Schema.String,
  status: Schema.Literals(["modified", "added", "deleted", "untracked", "renamed"]),
  staged: Schema.Boolean,
}).annotate({ identifier: "GitFileStatus" })

export const GitStatusSchema = Schema.Struct({
  branch: Schema.String,
  clean: Schema.Boolean,
  ahead: Schema.Number,
  behind: Schema.Number,
  staged: Schema.Array(GitFileStatusSchema),
  unstaged: Schema.Array(GitFileStatusSchema),
  untracked: Schema.Array(Schema.String),
}).annotate({ identifier: "GitStatus" })

export const GitBranchSchema = Schema.Struct({
  current: Schema.String,
  all: Schema.Array(Schema.String),
}).annotate({ identifier: "GitBranch" })

export const GitApi = HttpApi.make("git")
  .add(
    HttpApiGroup.make("git")
      .add(
        HttpApiEndpoint.get("status", "/git/status", {
          query: WorkspaceRoutingQuery,
          success: described(GitStatusSchema, "Git status"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "git.status",
            summary: "Get Git working tree status",
            description: "Retrieve branch, staged, unstaged, and untracked file status.",
          }),
        ),
        HttpApiEndpoint.post("stage", "/git/stage", {
          payload: Schema.Struct({ paths: Schema.Array(Schema.String) }),
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Stage result"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "git.stage",
            summary: "Stage files",
            description: "Stage modified or untracked files for commit.",
          }),
        ),
        HttpApiEndpoint.post("unstage", "/git/unstage", {
          payload: Schema.Struct({ paths: Schema.Array(Schema.String) }),
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Unstage result"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "git.unstage",
            summary: "Unstage files",
            description: "Unstage files from git index.",
          }),
        ),
        HttpApiEndpoint.post("commit", "/git/commit", {
          payload: Schema.Struct({ message: Schema.String }),
          query: WorkspaceRoutingQuery,
          success: described(
            Schema.Struct({
              success: Schema.Boolean,
              hash: Schema.optional(Schema.String),
              error: Schema.optional(Schema.String),
            }),
            "Commit result",
          ),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "git.commit",
            summary: "Create Git commit",
            description: "Commit staged changes with a commit message.",
          }),
        ),
        HttpApiEndpoint.get("branches", "/git/branches", {
          query: WorkspaceRoutingQuery,
          success: described(GitBranchSchema, "Git branches"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "git.branches",
            summary: "List branches",
            description: "Get all local branches and current active branch.",
          }),
        ),
        HttpApiEndpoint.post("checkout", "/git/checkout", {
          payload: Schema.Struct({
            branch: Schema.String,
            create: Schema.optional(Schema.Boolean),
          }),
          query: WorkspaceRoutingQuery,
          success: described(
            Schema.Struct({
              success: Schema.Boolean,
              error: Schema.optional(Schema.String),
            }),
            "Checkout result",
          ),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "git.checkout",
            summary: "Checkout or create branch",
            description: "Switch active Git branch or create a new branch.",
          }),
        ),
        HttpApiEndpoint.post("pull", "/git/pull", {
          query: WorkspaceRoutingQuery,
          success: described(
            Schema.Struct({ success: Schema.Boolean, output: Schema.String }),
            "Pull result",
          ),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "git.pull",
            summary: "Git pull",
            description: "Pull changes from remote repository.",
          }),
        ),
        HttpApiEndpoint.post("push", "/git/push", {
          query: WorkspaceRoutingQuery,
          success: described(
            Schema.Struct({ success: Schema.Boolean, output: Schema.String }),
            "Push result",
          ),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "git.push",
            summary: "Git push",
            description: "Push local commits to upstream repository.",
          }),
        ),
        HttpApiEndpoint.post("discard", "/git/discard", {
          payload: Schema.Struct({ paths: Schema.Array(Schema.String) }),
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Discard result"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "git.discard",
            summary: "Discard file changes",
            description: "Revert unstaged modifications in working directory.",
          }),
        ),
      )
      .annotateMerge(
        OpenApi.annotations({
          title: "git",
          description: "Git source control HttpApi routes.",
        }),
      )
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(Authorization),
  )
