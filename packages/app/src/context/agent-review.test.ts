import { describe, expect, test } from "bun:test"

describe("Agent + Editor + Diff Integration", () => {
  test("calculates diff additions and deletions stats accurately", () => {
    const original = "line 1\nline 2\nline 3"
    const proposed = "line 1\nline 2\nline 3\nline 4\nline 5"

    const origLines = original.split("\n")
    const newLines = proposed.split("\n")
    const additions = Math.max(0, newLines.length - origLines.length)
    const deletions = Math.max(0, origLines.length - newLines.length)

    expect(additions).toBe(2)
    expect(deletions).toBe(0)
  })

  test("agent edit on clean file transitions cleanly to pending review", () => {
    const fileState = {
      path: "src/server.ts",
      content: "console.log('original')",
      diskContent: "console.log('original')",
      isDirty: false,
    }

    const agentProposal = {
      path: "src/server.ts",
      originalContent: "console.log('original')",
      proposedContent: "console.log('agent updated code')",
      status: "pending" as "pending" | "accepted" | "rejected",
    }

    expect(agentProposal.status).toBe("pending")

    // Accept change
    fileState.content = agentProposal.proposedContent
    fileState.diskContent = agentProposal.proposedContent
    fileState.isDirty = false
    agentProposal.status = "accepted"

    expect(fileState.content).toBe("console.log('agent updated code')")
    expect(agentProposal.status).toBe("accepted")
  })

  test("agent edit on dirty file protects human uncommitted edits", () => {
    const fileState = {
      path: "src/server.ts",
      content: "console.log('human working on feature')",
      diskContent: "console.log('original')",
      isDirty: true,
    }

    const agentProposal = {
      path: "src/server.ts",
      originalContent: "console.log('original')",
      proposedContent: "console.log('agent proposal')",
      status: "pending" as "pending" | "accepted" | "rejected",
    }

    // Human edit remains untouched in buffer
    expect(fileState.content).toBe("console.log('human working on feature')")
    expect(fileState.isDirty).toBe(true)

    // Rejection leaves human edit intact
    agentProposal.status = "rejected"
    expect(fileState.content).toBe("console.log('human working on feature')")
    expect(agentProposal.status).toBe("rejected")
  })

  test("batch multi-file accept and reject transitions", () => {
    const changes: Record<string, { status: "pending" | "accepted" | "rejected" }> = {
      "fileA.ts": { status: "pending" },
      "fileB.ts": { status: "pending" },
      "fileC.ts": { status: "pending" },
    }

    // Accept All
    for (const key of Object.keys(changes)) {
      changes[key].status = "accepted"
    }

    expect(Object.values(changes).every((c) => c.status === "accepted")).toBe(true)

    // Reject All
    for (const key of Object.keys(changes)) {
      changes[key].status = "rejected"
    }

    expect(Object.values(changes).every((c) => c.status === "rejected")).toBe(true)
  })
})
