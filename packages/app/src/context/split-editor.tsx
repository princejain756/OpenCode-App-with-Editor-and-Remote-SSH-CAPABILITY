import { createSignal } from "solid-js"
import { createSimpleContext } from "@opencode-ai/ui/context"

export type SplitDirection = "none" | "vertical" | "horizontal"

export const { use: useSplitEditor, provider: SplitEditorProvider } = createSimpleContext({
  name: "SplitEditor",
  gate: false,
  init: () => {
    const [splitDirection, setSplitDirection] = createSignal<SplitDirection>("none")
    const [activePane, setActivePane] = createSignal<"primary" | "secondary">("primary")
    const [secondaryPath, setSecondaryPath] = createSignal<string | undefined>(undefined)
    const [splitRatio, setSplitRatio] = createSignal<number>(0.5)

    const toggleSplit = (direction: "vertical" | "horizontal" = "vertical") => {
      if (splitDirection() === direction) {
        setSplitDirection("none")
        setSecondaryPath(undefined)
      } else {
        setSplitDirection(direction)
      }
    }

    const openInSecondary = (filePath: string) => {
      setSecondaryPath(filePath)
      if (splitDirection() === "none") {
        setSplitDirection("vertical")
      }
      setActivePane("secondary")
    }

    const closeSecondary = () => {
      setSplitDirection("none")
      setSecondaryPath(undefined)
      setActivePane("primary")
    }

    return {
      splitDirection,
      setSplitDirection,
      activePane,
      setActivePane,
      secondaryPath,
      setSecondaryPath,
      splitRatio,
      setSplitRatio,
      toggleSplit,
      openInSecondary,
      closeSecondary,
    }
  },
})
