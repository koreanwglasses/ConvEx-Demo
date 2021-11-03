import { client } from "./bot";

export function fetchUser(userId: string) {
  return client.users.fetch(userId);
}

export function listGuilds() {
  return client.guilds.cache;
}
