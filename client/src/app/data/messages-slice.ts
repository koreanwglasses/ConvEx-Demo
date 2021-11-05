import { createSlice } from "@reduxjs/toolkit";
import type { AppThunk, RootState } from "../store";
import { MessageData } from "../../common/api-data-types";
import { fetchJSON } from "../../utils";

// Define a type for the slice state
interface MessagesState {
  [key: string]: {
    pending: boolean;
    messages: MessageData[];
    lastErr?: any;
  };
}

const key = (guildId: string, channelId: string) => `${guildId}/${channelId}`;

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
      const slice = state[key(guildId, channelId)] ?? {
        messages: [],
      };
      slice.pending = true;

      state[key(guildId, channelId)] = slice;
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
      const slice = state[key(guildId, channelId)] ?? {
        messages: [],
      };
      slice.pending = false;
      slice.lastErr = err;
      if (messages) {
        slice.messages = mergeMessages(slice.messages, messages);
      }

      state[key(guildId, channelId)] = slice;
    },
  },
});

const { startFetchingMessages, finishFetchingMessages } = Messages.actions;

export const fetchOlder =
  (guildId: string, channelId: string, limit?: number): AppThunk =>
  async (dispatch, getState) => {
    const slice = getState().messages[key(guildId, channelId)] ?? {
      messages: [],
    };
    if (slice.pending) return;

    const oldest = slice.messages.length
      ? slice.messages[slice.messages.length - 1]
      : undefined;

    dispatch(startFetchingMessages({ guildId, channelId }));
    const [err, messages] = await fetchJSON(
      `/api/messages/${guildId}/${channelId}/fetch`,
      {
        before: oldest?.id,
        limit,
      }
    );
    dispatch(finishFetchingMessages({ guildId, channelId, messages, err }));
  };

export const fetchNewer =
  (guildId: string, channelId: string, limit?: number): AppThunk =>
  async (dispatch, getState) => {
    const slice = getState().messages[key(guildId, channelId)] ?? {
      messages: [],
    };
    if (slice.pending) return;

    const newest = slice.messages.length ? slice.messages[0] : undefined;

    dispatch(startFetchingMessages({ guildId, channelId }));
    const [err, messages] = await fetchJSON(
      `/api/messages/${guildId}/${channelId}/fetch`,
      {
        after: newest?.id,
        limit,
      }
    );
    dispatch(finishFetchingMessages({ guildId, channelId, messages, err }));
  };

export const selectMessages =
  (guildId: string, channelId: string) => (state: RootState) =>
    state.messages[key(guildId, channelId)];

export default Messages.reducer;
