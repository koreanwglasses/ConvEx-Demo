import * as DiscordBot from "./discord/bot";
import * as PerspectiveClient from "./analysis/perspective";
import app from "./app";
import config from "./config";

(async () => {
  console.log("Initializing clients...");
  await DiscordBot.init();
  PerspectiveClient.init();

  console.log("Starting server...");
  const { port, hostname } = config.express;
  app.listen(port, hostname, () => {
    console.log(`Server is listening on http://${hostname}:${port}/`);
  });
})();
