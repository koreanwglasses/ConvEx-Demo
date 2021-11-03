import config from "../config";
import { Client } from "discord.js";

export const client = new Client({
  intents: ["GUILDS", "GUILD_MESSAGES"],
});

export function init() {
  client.login(config.discord.botToken);
}
