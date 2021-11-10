import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch, AppThunk, RootState, store } from "../store";
import { MessageData } from "../../common/api-data-types";
import { fetchJSON } from "../../utils";
import socket from "../sockets";
import { WritableDraft } from "immer/dist/types/types-external";
import { fetchAnalyses } from "./analyses-slice";

interface SubState {
  pending: boolean;
  messages?: MessageData[];
  lastErr?: any;
  reachedBeginning: boolean;
  isUpToDate: boolean;
  listeners: ((message: MessageData) => void)[];
}

// Define a type for the slice state
interface MessagesState {
  [key: string]: SubState;
}

const key = (guildId: string, channelId: string) => `${guildId}/${channelId}`;
export const sub = (
  state: MessagesState,
  guildId: string,
  channelId: string,
  write = true
) => {
  const defaults = {
    pending: false,
    reachedBeginning: false,
    isUpToDate: false,
    listeners: [],
  };
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
    addListener(
      state,
      action: {
        payload: {
          guildId: string;
          channelId: string;
          listener: (message: MessageData) => void;
        };
      }
    ) {
      const { guildId, channelId, listener } = action.payload;
      const slice = sub(state, guildId, channelId);
      slice.listeners.push(listener);
    },
    removeListener(
      state,
      action: {
        payload: {
          guildId: string;
          channelId: string;
          listener: (message: MessageData) => void;
        };
      }
    ) {
      const { guildId, channelId, listener } = action.payload;
      const slice = sub(state, guildId, channelId);
      const i = slice.listeners.indexOf(listener);
      if (i < 0) return;
      slice.listeners.splice(i, 1);

      if (slice.listeners.length === 0) slice.isUpToDate = false;
    },
    setProperty<P extends keyof SubState>(
      state: WritableDraft<MessagesState>,
      action: {
        payload: {
          guildId: string;
          channelId: string;
          key: P;
          value: SubState[P];
        };
      }
    ) {
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
  addListener,
  removeListener,
} = Messages.actions;

export const fetchOlderMessages =
  (
    guildId: string,
    channelId: string,
    { limit = 100 }: { limit?: number } = {}
  ): AppThunk<Promise<MessageData[]>> =>
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

    if (!oldest && messages) {
      dispatch(loadedLatestMessage(guildId, channelId));
    }

    if (messages && messages.length < limit) {
      dispatch(
        setProperty({
          guildId,
          channelId,
          key: "reachedBeginning",
          value: true,
        })
      );
    }

    if (messages) {
      dispatch(fetchAnalyses(messages));
    }

    return messages;
  };

export const fetchNewerMessages =
  (
    guildId: string,
    channelId: string,
    { limit = 100 }: { limit?: number } = {}
  ): AppThunk<Promise<MessageData[] | undefined>> =>
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

    if (messages && messages.length < limit) {
      dispatch(loadedLatestMessage(guildId, channelId));
    }

    if (messages) {
      dispatch(fetchAnalyses(messages));
    }

    return messages;
  };

const loadedLatestMessage =
  (guildId: string, channelId: string): AppThunk =>
  (dispatch, getState) => {
    const slice = sub(getState().messages, guildId, channelId, false);
    dispatch(
      setProperty({
        guildId,
        channelId,
        key: "isUpToDate",
        value: true,
      })
    );

    if (slice.listeners.length === 0) {
      const keepAliveListener = () => {
        dispatch(unsubscribe(guildId, channelId, keepAliveListener));
      };
      dispatch(subscribe(guildId, channelId, keepAliveListener));
    }
  };

socket.on(
  "messages",
  (guildId: string, channelId: string, message: MessageData) => {
    const slice = sub(store.getState().messages, guildId, channelId);
    if (slice.isUpToDate) {
      store.dispatch(unshiftMessage({ guildId, channelId, message }));
      (store.dispatch as AppDispatch)(fetchAnalyses([message]));
    }
    slice.listeners.forEach((listener) => listener(message));
  }
);

export const subscribe =
  (
    guildId: string,
    channelId: string,
    listener: (message: MessageData) => void
  ): AppThunk =>
  (dispatch, getState) => {
    const slice = sub(getState().messages, guildId, channelId, false);
    if (slice.listeners.indexOf(listener) !== -1) return;

    if (slice.listeners.length === 0) {
      socket.emit("messages/subscribe", guildId, channelId);
      socket.on("messages/subscribe", ([err]) => {
        if (err) throw err;
      });
    }

    dispatch(addListener({ guildId, channelId, listener }));
  };

export const unsubscribe =
  (
    guildId: string,
    channelId: string,
    listener: (message: MessageData) => void
  ): AppThunk =>
  (dispatch, getState) => {
    const slice = sub(getState().messages, guildId, channelId, false);
    const i = slice.listeners.indexOf(listener);
    if (i === -1) return;

    if (slice.listeners.length === 1) {
      socket.emit("messages/unsubscribe", guildId, channelId);
      socket.on("messages/unsubscribe", ([err]) => {
        if (err) throw err;
      });
    }

    dispatch(removeListener({ guildId, channelId, listener }));
  };

export const selectMessages =
  (guildId: string, channelId: string) => (state: RootState) =>
    sub(state.messages, guildId, channelId, false);

export default Messages.reducer;
