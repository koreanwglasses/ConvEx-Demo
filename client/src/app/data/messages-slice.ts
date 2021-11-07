import { createSlice } from "@reduxjs/toolkit";
import { AppThunk, RootState, store } from "../store";
import { MessageData } from "../../common/api-data-types";
import { fetchJSON } from "../../utils";
import { fetchAnalyses } from "./analyses-slice";
import socket from "../sockets";
import { WritableDraft } from "immer/dist/types/types-external";

interface SubState {
  pending: boolean;
  messages?: MessageData[];
  lastErr?: any;
  reachedBeginning: boolean;
  isUpToDate: boolean;
  isAutoFetching: boolean;
  isSubscribed: boolean;
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
    isUpToDate: false,
    isSubscribed: false,
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
        };
      }
    ) {
      const { guildId, channelId } = action.payload;
      const slice = sub(state, guildId, channelId);
      slice.pending = true;
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
    setProperty: <P extends keyof SubState>(
      state: WritableDraft<MessagesState>,
      action: {
        payload: {
          guildId: string;
          channelId: string;
          key: P;
          value: SubState[P];
        };
      }
    ) => {
      const { guildId, channelId, key, value } = action.payload;
      const slice = sub(state, guildId, channelId);
      slice[key] = value;
    },
  },
});

const {
  startFetchingMessages,
  finishFetchingMessages,
  unshiftMessage,
  setProperty,
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

    dispatch(startFetchingMessages({ guildId, channelId }));
    const [err, messages] = await fetchJSON(`/api/messages/fetch`, {
      guildId,
      channelId,
      options: {
        before: oldest?.id,
        limit,
      },
    });

    dispatch(finishFetchingMessages({ guildId, channelId, messages, err }));

    if (messages?.length && limit && messages.length < limit) {
      dispatch(
        setProperty({
          guildId,
          channelId,
          key: "reachedBeginning",
          value: true,
        })
      );
    }

    if (analyze && messages) {
      dispatch(fetchAnalyses(messages));
    }
  };

export const fetchNewerMessages =
  (
    guildId: string,
    channelId: string,
    { limit = 100, analyze = true }: { limit?: number; analyze?: boolean } = {}
  ): AppThunk =>
  async (dispatch, getState) => {
    const slice = sub(getState().messages, guildId, channelId, false);
    if (slice.pending) return;

    const newest = slice.messages?.length ? slice.messages[0] : undefined;

    dispatch(startFetchingMessages({ guildId, channelId }));
    const [err, messages] = await fetchJSON(`/api/messages/fetch`, {
      guildId,
      channelId,
      options: {
        after: newest?.id,
        limit,
      },
    });
    dispatch(finishFetchingMessages({ guildId, channelId, messages, err }));

    if (messages?.length && limit && messages.length < limit) {
      dispatch(
        setProperty({ guildId, channelId, key: "isUpToDate", value: true })
      );
      dispatch(subscribe(guildId, channelId));
    }

    if (analyze && messages) {
      dispatch(fetchAnalyses(messages));
    }
  };

// Subscribe/autofetch
socket.on(
  "messages",
  (guildId: string, channelId: string, message: MessageData) => {
    const slice = sub(store.getState().messages, guildId, channelId);
    if (slice.isAutoFetching)
      store.dispatch(unshiftMessage({ guildId, channelId, message }));
    else if (slice.isUpToDate)
      store.dispatch(
        setProperty({ guildId, channelId, key: "isUpToDate", value: false })
      );
  }
);

export const subscribe =
  (guildId: string, channelId: string): AppThunk =>
  (dispatch, getState) => {
    const slice = sub(getState().messages, guildId, channelId, false);
    if (slice.isSubscribed) return;
    dispatch(
      setProperty({ guildId, channelId, key: "isSubscribed", value: true })
    );

    socket.emit("messages/subscribe", guildId, channelId);
    socket.on("messages/subscribe", ([err]) => {
      if (err) throw err;
    });
  };

export const unsubscribe =
  (guildId: string, channelId: string): AppThunk =>
  (dispatch, getState) => {
    const slice = sub(getState().messages, guildId, channelId, false);
    if (slice.isSubscribed) return;
    dispatch(
      setProperty({ guildId, channelId, key: "isSubscribed", value: false })
    );

    socket.emit("messages/unsubscribe", guildId, channelId);
    socket.on("messages/unsubscribe", ([err]) => {
      if (err) throw err;
    });
  };

export const enableAutoFetch = (guildId: string, channelId: string) =>
  setProperty({ guildId, channelId, key: "isAutoFetching", value: true });

export const disableAutoFetch = (guildId: string, channelId: string) =>
  setProperty({ guildId, channelId, key: "isAutoFetching", value: false });

export const selectMessages =
  (guildId: string, channelId: string) => (state: RootState) =>
    sub(state.messages, guildId, channelId, false);

export default Messages.reducer;
