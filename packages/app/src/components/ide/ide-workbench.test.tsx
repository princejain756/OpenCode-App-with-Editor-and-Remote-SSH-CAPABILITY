/**
 * Smoke tests for the IDEWorkbench — verify the module is well-formed and
 * exports the expected public surface.
 *
 * The full workbench component is tightly coupled to the IDE context chain
 * (Buffer, File, SSH, Git, LSP, DAP, AgentReview, TimelineSync, Terminal)
 * and the OpenCode server, so we don't render it here. End-to-end visual
 * coverage comes from running the desktop app and clicking through the UI.
 *
 * These tests catch:
 *   - import-time errors (missing exports, type drift, broken modules)
 *   - simple structural assertions on the workbench's exported shape
 */

import { describe, expect, test } from "bun:test"
import { IDEWorkbench } from "./ide-workbench"

describe("IDEWorkbench", () => {
  test("exports a function component", () => {
    expect(typeof IDEWorkbench).toBe("function")
  })

  test("component name is preserved", () => {
    expect(IDEWorkbench.name).toBe("IDEWorkbench")
  })
})
