import { User } from "discord.js";
import { RequestHandler, NextFunction, Request, Response } from "express";
import { Server } from "http";
import passport from "passport";
import * as SocketIO from "socket.io";
import { sessionMiddleware } from "./app";
import * as DiscordSocketRouter from "./discord/socket-router";

type Socket = SocketIO.Socket & {
  request: { user: User };
};

export type SocketEventHandler<
  Args extends unknown[],
  Result = any,
  Err = any
> = (
  socket: Socket,
  args: Args,
  res: {
    err: (err: Err) => void;
    send: (result: Result | "OK") => void;
  },
  next: () => void
) => void;

export class SocketRouter {
  private handlers: [ev: string, ...handler: SocketEventHandler<any>[]][] = [];
  private middleware: SocketEventHandler<any>[] = [];

  handleEvent<Args extends unknown[], Result = any, Err = any>(
    ev: string,
    ...handler: SocketEventHandler<Args, Result, Err>[]
  ) {
    this.handlers.push([ev, ...handler]);
  }

  use<Args extends unknown[], Result = any, Err = any>(
    middleware: SocketEventHandler<Args, Result, Err>
  ) {
    this.middleware.push(middleware);
  }

  bind(socket: Socket) {
    this.handlers.forEach(([ev, ...handler]) =>
      socket.on(ev, (...args) => {
        const handlers = [...this.middleware, ...handler];
        const callHandler = (i: number) =>
          handlers[i](
            socket,
            args,
            {
              err(err) {
                socket.emit(ev, [err]);
              },

              send(result) {
                socket.emit(ev, [null, result]);
              },
            },
            () => callHandler(i + 1)
          );
        callHandler(0);
      })
    );
  }
}

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
    DiscordSocketRouter.connect().bind(socket);
  });
};
