import { ConvExSocketError } from "../common/api-errors";
import { SocketEventHandler } from "../sockets";
import { hasModeratorAccess } from "./helpers";

export const socketRequireAuthenticated: SocketEventHandler<[]> = (
  socket,
  [],
  res,
  next
) => {
  if (!socket.request.user?.username) {
    res.err(new ConvExSocketError("Unauthorized"));
    socket.disconnect(true);
    return;
  }

  next();
};

export const socketRequireModeratorAccess: SocketEventHandler<
  [guildId: string, channelId: string]
> = (socket, [guildId, channelId], res, next) => {
  const { id: userId } = socket.request.user;
  if (!hasModeratorAccess(userId, guildId, channelId)) {
    return res.err(new ConvExSocketError("Forbidden"));
  }

  next();
};
