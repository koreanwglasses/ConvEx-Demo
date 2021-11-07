import { createSlice } from "@reduxjs/toolkit";
import { AppThunk, RootState, store } from "../store";
import { MessageData } from "../../common/api-data-types";
import { fetchJSON } from "../../utils";
import { fetchAnalyses } from "./analyses-slice";
import socket from "../sockets";

interface SubState {
  pending: boolean;
  messages?: MessageData[];
  lastErr?: any;
  reachedBeginning: boolean;
  lastLimit?: number;
  isAutoFetching: boolean;
}

// Define a type for the slice state
interface MessagesState {
  [key: string]: SubState;
}

const key = (guildId: string, channelId: string) => `${guildId}/${channelId}`;
const sub = (
  state: MessagesState,
  guildId: string,
  channelId: string,
  write = true
) => {
  const defaults = {
    pending: false,
    reachedBeginning: false,
    isAutoFetching: false,
  } as const;
  return (
    state[key(guildId, channelId)] ??
    (write ? (state[key(guildId, channelId)] = defaults) : defaults)
  );
};

const mergeMessages = (
  currentMessages: MessageData[],
  incomingMessages: MessageData[]
): MessageData[] => {
  const allMessages = new Map(
    currentMessages.map((message) => [message.id, message] as const)
  );
  incomingMessages.forEach((message) => allMessages.set(message.id, message));
  return [...allMessages.values()].sort(
    (a, b) => b.createdTimestamp - a.createdTimestamp
  );
};

// Define the initial state using that type
const initialState: MessagesState = {};

export const Messages = createSlice({
  name: "counter",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    startFetchingMessages(
      state,
      action: {
        payload: {
          guildId: string;
          channelId: string;
          limit: number;
        };
      }
    ) {
      const { guildId, channelId } = action.payload;
      const slice = sub(state, guildId, channelId);
      slice.pending = true;
      slice.lastLimit = action.payload.limit;
    },
    finishFetchingMessages(
      state,
      action: {
        payload: {
          guildId: string;
          channelId: string;
          messages?: MessageData[];
          err?: any;
        };
      }
    ) {
      const { guildId, channelId, messages, err } = action.payload;
      const slice = sub(state, guildId, channelId);
      slice.pending = false;
      slice.lastErr = err;
      if (messages) {
        slice.messages = mergeMessages(slice.messages ?? [], messages);
      }

      if (
        messages?.length &&
        slice.lastLimit &&
        messages.length < slice.lastLimit
      ) {
        slice.reachedBeginning = true;
      }
    },
    setAutoFetching(
      state,
      action: {
        payload: {
          guildId: string;
          channelId: string;
          isAutoFetching: boolean;
        };
      }
    ) {
      const { guildId, channelId, isAutoFetching } = action.payload;
      const slice = sub(state, guildId, channelId);
      slice.isAutoFetching = isAutoFetching;
    },
    unshiftMessage(
      state,
      action: {
        payload: {
          guildId: string;
          channelId: string;
          message: MessageData;
        };
      }
    ) {
      const { guildId, channelId, message } = action.payload;
      const slice = sub(state, guildId, channelId);
      slice.messages = [message, ...(slice.messages ?? [])];
    },
  },
});

const {
  startFetchingMessages,
  finishFetchingMessages,
  setAutoFetching,
  unshiftMessage,
} = Messages.actions;

export const fetchOlderMessages =
  (
    guildId: string,
    channelId: string,
    { limit = 100, analyze = true }: { limit?: number; analyze?: boolean } = {}
  ): AppThunk =>
  async (dispatch, getState) => {
    const slice = sub(getState().messages, guildId, channelId, false);
    if (slice.pending) return;

    const oldest = slice.messages?.length
      ? slice.messages[slice.messages.length - 1]
      : undefined;

    dispatch(startFetchingMessages({ guildId, channelId, limit }));
    const [err, messages] = await fetchJSON(`/api/messages/fetch`, {
      guildId,
      channelId,
      options: {
        before: oldest?.id,
        limit,
      },
    });
    dispatch(finishFetchingMessages({ guildId, channelId, messages, err }));

    if (analyze && messages) {
      dispatch(fetchAnalyses(messages));
    }
  };

// Autofetch
socket.on(
  "messages",
  (guildId: string, channelId: string, message: MessageData) => {
    store.dispatch(unshiftMessage({ guildId, channelId, message }));
  }
);
export const enableAutoFetch =
  (guildId: string, channelId: string): AppThunk =>
  (dispatch, getState) => {
    const slice = sub(getState().messages, guildId, channelId, false);
    if (slice.isAutoFetching) return;
    dispatch(setAutoFetching({ guildId, channelId, isAutoFetching: true }));

    socket.emit("messages/subscribe", guildId, channelId);
    socket.on("messages/subscribe", ([err]) => {
      if (err) throw err;
    });
  };

export const disableAutoFetch =
  (guildId: string, channelId: string): AppThunk =>
  (dispatch, getState) => {
    const slice = sub(getState().messages, guildId, channelId, false);
    if (!slice.isAutoFetching) return;
    dispatch(setAutoFetching({ guildId, channelId, isAutoFetching: false }));

    socket.emit("messages/unsubscribe", guildId, channelId);
    socket.on("messages/unsubscribe", ([err]) => {
      if (err) throw err;
    });
  };

export const selectMessages =
  (guildId: string, channelId: string) => (state: RootState) =>
    sub(state.messages, guildId, channelId, false);

export default Messages.reducer;
