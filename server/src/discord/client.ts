import config from "../config";
import { Client } from "discord.js";

const client = new Client({
  intents: ["GUILDS", "GUILD_MESSAGES"],
});

export function init() {
  return client.login(config.discord.botToken);
}

export default client;
