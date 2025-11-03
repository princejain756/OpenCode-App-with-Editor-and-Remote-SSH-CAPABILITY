import { Server } from "../../server/server"
import { UI } from "../ui"
import { cmd } from "./cmd"

export const ServeCommand = cmd({
  command: "serve",
  builder: (yargs) =>
    yargs
      .option("port", {
        alias: ["p"],
        type: "number",
        describe: "port to listen on",
        default: 0,
      })
      .option("hostname", {
        type: "string",
        describe: "hostname to listen on",
        default: "127.0.0.1",
      }),
  describe: "starts a headless opencode server",
  handler: async (args) => {
    const hostname = args.hostname
    const port = args.port
    const server = Server.listen({
      port,
      hostname,
    })
    UI.println(
      UI.Style.TEXT_NORMAL_BOLD,
      "Web interface:    ",
      UI.Style.TEXT_NORMAL,
      `https://desktop.dev.opencode.ai?url=${server.url}`,
    )
    await new Promise(() => {})
    await server.stop()
  },
})
