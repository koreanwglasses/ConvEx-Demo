import { createSlice } from "@reduxjs/toolkit";
import type { AppThunk, RootState } from "../store";
import { MessageData } from "../../common/api-data-types";
import { fetchJSON } from "../../utils";
import { fetchAnalyses } from "./analyses-slice";

// Define a type for the slice state
interface MessagesState {
  [key: string]: {
    pending: boolean;
    messages?: MessageData[];
    lastErr?: any;
    reachedBeginning: boolean;
    lastLimit?: number;
  };
}

const defaultValue = () => ({ pending: false, reachedBeginning: false });

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
          limit: number;
        };
      }
    ) {
      const { guildId, channelId } = action.payload;
      const slice = state[key(guildId, channelId)] ?? defaultValue();
      slice.pending = true;
      slice.lastLimit = action.payload.limit;

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
      const slice = state[key(guildId, channelId)] ?? defaultValue();
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

      state[key(guildId, channelId)] = slice;
    },
  },
});

const { startFetchingMessages, finishFetchingMessages } = Messages.actions;

export const fetchOlderMessages =
  (
    guildId: string,
    channelId: string,
    { limit = 100, analyze = true }: { limit?: number; analyze?: boolean } = {}
  ): AppThunk =>
  async (dispatch, getState) => {
    const slice =
      getState().messages[key(guildId, channelId)] ?? defaultValue();
    if (slice.pending) return;

    const oldest = slice.messages?.length
      ? slice.messages[slice.messages.length - 1]
      : undefined;

    dispatch(startFetchingMessages({ guildId, channelId, limit }));
    const [err, messages] = await fetchJSON(
      `/api/messages/${guildId}/${channelId}/fetch`,
      {
        before: oldest?.id,
        limit,
      }
    );
    dispatch(finishFetchingMessages({ guildId, channelId, messages, err }));

    if (analyze) {
      dispatch(
        fetchAnalyses(
          messages.map((message: MessageData) => ({
            guildId,
            channelId,
            messageId: message.id,
          }))
        )
      );
    }
  };

export const selectMessages =
  (guildId: string, channelId: string) => (state: RootState) =>
    state.messages[key(guildId, channelId)] ?? defaultValue();

export default Messages.reducer;
