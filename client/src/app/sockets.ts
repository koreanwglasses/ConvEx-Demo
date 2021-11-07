import io from "socket.io-client";
import { ConvExSocketError } from "../common/api-errors";

const socket = io();

socket.on("connect/error", (error: ConvExSocketError) => {
  console.warn("Could not connect to socket:", error);
});

export default socket;
