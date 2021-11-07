import * as DiscordBot from "./discord/bot";
import * as PerspectiveClient from "./analysis/perspective";
import * as Database from "./database";
import * as Sockets from "./sockets";
import mongoose from "mongoose";
import app from "./app";
import config from "./config";

(async () => {
  console.log("Initializing clients...");
  await DiscordBot.init();
  PerspectiveClient.init();

  console.log("Initializing database asynchronously...");
  Database.init();

  console.log("Starting server...");
  const { port, hostname } = config.server;
  const server = app.listen(port, hostname, () => {
    console.log(`Server is listening on http://${hostname}:${port}/`);
  });
  Sockets.mount(server);

  process.once("SIGINT", async () => {
    console.log("Shutting down...");
    server.close(() => {
      console.log("express server closed");
    });

    await mongoose.disconnect();
    console.log("mongoose disconnected");
  });
})();
