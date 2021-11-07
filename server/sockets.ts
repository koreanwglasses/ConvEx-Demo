import { Message, User } from "discord.js";
import { RequestHandler, NextFunction, Request, Response } from "express";
import { Server } from "http";
import passport from "passport";
import * as SocketIO from "socket.io";
import { sessionMiddleware } from "./app";
import { ConvExSocketError } from "./common/api-errors";
import client from "./discord/bot";
import { toMessageData } from "./discord/model";
import { hasModeratorAccess, requireAuthenticated } from "./oauth/helpers";

type Socket = SocketIO.Socket & {
  request: { user: User };
};

const useHandleEvent =
  (socket: Socket) =>
  <Args extends unknown[], Result = any, Err = any>(
    ev: string,
    handler: (
      res: {
        err: (err: Err) => void;
        send: (result: Result | "OK") => void;
      },
      ...args: Args
    ) => void
  ) =>
    socket.on(ev, (...args: Args) =>
      handler(
        {
          err(err: Err) {
            socket.emit(ev, [err]);
          },

          send(result: Result) {
            socket.emit(ev, [null, result]);
          },
        },
        ...args
      )
    );

export const mount = (server: Server) => {
  const io = new SocketIO.Server(server);

  // convert a connect middleware to a Socket.IO middleware
  const wrap =
    (middleware: RequestHandler) =>
    (socket: SocketIO.Socket, next: NextFunction) =>
      middleware(socket.request as Request, {} as Response, next);

  io.use(wrap(sessionMiddleware));
  io.use(wrap(passport.initialize()));
  io.use(wrap(passport.session()));
  io.on("connect", (socket: Socket) => {
    // Check authorization
    if (!socket.request.user?.username) {
      socket.emit("connect/error", new ConvExSocketError("Unauthorized"));
      socket.disconnect(true);
      return;
    }
    const { id: userId } = socket.request.user;

    const handleEvent = useHandleEvent(socket);

    // Message Subscribe and Unsubscribe
    {
      const listeners = {} as Record<
        `${string}/${string}`,
        (message: Message<boolean>) => void
      >;
      const key = (guildId: string, channelId: string) =>
        `${guildId}/${channelId}`;

      handleEvent(
        "messages/subscribe",
        ({ err, send }, guildId: string, channelId: string) => {
          if (!hasModeratorAccess(userId, guildId, channelId)) {
            return err(new ConvExSocketError("Forbidden"));
          }

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

      handleEvent(
        "messages/unsubscribe",
        ({ err, send }, guildId: string, channelId: string) => {
          if (!hasModeratorAccess(userId, guildId, channelId)) {
            return err(new ConvExSocketError("Forbidden"));
          }

          if (!(key(guildId, channelId) in listeners)) {
            return err(new ConvExSocketError("Not subscribed"));
          }

          client.off("messageCreate", listeners[key(guildId, channelId)]);
          delete listeners[key(guildId, channelId)];

          return send("OK");
        }
      );
    }
  });
};
