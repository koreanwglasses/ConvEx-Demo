import { Message } from "discord.js";
import { ConvExSocketError } from "../common/api-errors";
import {
  socketRequireAuthenticated,
  socketRequireModeratorAccess,
} from "../oauth/socket-helpers";
import { SocketRouter } from "../sockets";
import client from "./client";
import { toMessageData } from "./model";

export const connect = () => {
  const router = new SocketRouter();

  router.use(socketRequireAuthenticated);
  router.use(socketRequireModeratorAccess);

  const listeners = {} as Record<
    `${string}/${string}`,
    (message: Message<boolean>) => void
  >;
  const key = (guildId: string, channelId: string) => `${guildId}/${channelId}`;

  router.handleEvent<[guildId: string, channelId: string]>(
    "messages/subscribe",
    (socket, [guildId, channelId], { err, send }) => {
      if (key(guildId, channelId) in listeners) {
        return err(new ConvExSocketError("Already subscribed"));
      }

      const listener = (message: Message<boolean>) => {
        if (message.guildId !== guildId || message.channelId !== channelId)
          return;
        socket.emit("messages", guildId, channelId, toMessageData(message));
      };

      client.on(
        "messageCreate",
        (listeners[key(guildId, channelId)] = listener)
      );

      return send("OK");
    }
  );

  router.handleEvent<[guildId: string, channelId: string]>(
    "messages/unsubscribe",
    (socket, [guildId, channelId], { err, send }) => {
      if (!(key(guildId, channelId) in listeners)) {
        return err(new ConvExSocketError("Not subscribed"));
      }

      client.off("messageCreate", listeners[key(guildId, channelId)]);
      delete listeners[key(guildId, channelId)];

      return send("OK");
    }
  );

  return router;
};
