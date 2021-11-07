import { createSlice } from "@reduxjs/toolkit";
import { WritableDraft } from "immer/dist/types/types-external";
import { MessageData } from "../../../../common/api-data-types";
import { AppThunk, RootState } from "../../../store";
import * as MessagesSlice from "../../../data/messages-slice";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { shallowEqual } from "react-redux";
import { useCallback } from "react";
import { arrayEqual } from "../../../../utils";

interface SubState {
  newestMessage?: MessageData;
  maxMessages: number;
  isStreaming: boolean;
  listener?: (message: MessageData) => void;
}

// Define a type for the slice state
interface ChannelVizGroupState {
  [key: string]: SubState;
}

const sub = (state: ChannelVizGroupState, groupKey: string, write = true) => {
  const defaults = {
    isStreaming: false,
    maxMessages: 0,
  } as const;
  return state[groupKey] ?? (write ? (state[groupKey] = defaults) : defaults);
};

// Define the initial state using that type
const initialState: ChannelVizGroupState = {};

export const ChannelVizGroups = createSlice({
  name: "counter",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    setProperty<P extends keyof SubState>(
      state: WritableDraft<ChannelVizGroupState>,
      action: {
        payload: {
          groupKey: string;
          key: P;
          value: SubState[P];
        };
      }
    ) {
      const { groupKey, key, value } = action.payload;
      const slice = sub(state, groupKey);
      slice[key] = value;
    },
    adjustMaxMessages(
      state,
      action: { payload: { groupKey: string; amount: number } }
    ) {
      const { groupKey, amount } = action.payload;
      const slice = sub(state, groupKey);
      slice.maxMessages += amount;
    },
  },
});

const { setProperty, adjustMaxMessages } = ChannelVizGroups.actions;

const fetchOlderMessages =
  (guildId: string, channelId: string, groupKey: string): AppThunk =>
  async (dispatch, getState) => {
    const group = sub(getState().channelVizGroups, groupKey, false);

    const slice = MessagesSlice.sub(
      getState().messages,
      guildId,
      channelId,
      false
    );

    if (slice.reachedBeginning) return;

    const i =
      (group.newestMessage && slice.messages?.indexOf(group.newestMessage)) ??
      0;
    const j = i + group.maxMessages + 100;

    if ((slice.messages?.length ?? 0) < j && !slice.pending) {
      dispatch(MessagesSlice.fetchOlderMessages(guildId, channelId));
    }

    dispatch(adjustMaxMessages({ groupKey, amount: 100 }));
  };

const fetchNewerMessages =
  (
    guildId: string,
    channelId: string,
    groupKey: string,
    limit = 100
  ): AppThunk =>
  async (dispatch, getState) => {
    const group = sub(getState().channelVizGroups, groupKey, false);

    const slice = MessagesSlice.sub(
      getState().messages,
      guildId,
      channelId,
      false
    );

    const i =
      ((group.newestMessage && slice.messages?.indexOf(group.newestMessage)) ??
        0) - limit;

    if (i >= 0) {
      dispatch(
        setProperty({
          groupKey,
          key: "newestMessage",
          value: slice.messages![i],
        })
      );
    } else if (!slice.pending && !slice.isUpToDate) {
      const messages = await dispatch(
        MessagesSlice.fetchNewerMessages(guildId, channelId)
      );
      if (messages) {
        dispatch(
          setProperty({
            groupKey,
            key: "newestMessage",
            value: messages[messages.length - i],
          })
        );
      }
    }
  };

const startStreaming =
  (guildId: string, channelId: string, groupKey: string): AppThunk =>
  (dispatch, getState) => {
    const group = sub(getState().channelVizGroups, groupKey, false);
    if (group.isStreaming) return;

    const listener = (message: MessageData) => {
      dispatch(fetchNewerMessages(guildId, channelId, groupKey, 1));
    };
    dispatch(MessagesSlice.subscribe(guildId, channelId, listener));
    dispatch(setProperty({ groupKey, key: "listener", value: listener }));
    dispatch(setProperty({ groupKey, key: "isStreaming", value: true }));
  };

const stopStreaming =
  (guildId: string, channelId: string, groupKey: string): AppThunk =>
  (dispatch, getState) => {
    const group = sub(getState().channelVizGroups, groupKey, false);
    if (!group.isStreaming) return;

    dispatch(MessagesSlice.unsubscribe(guildId, channelId, group.listener!));
    dispatch(setProperty({ groupKey, key: "listener", value: undefined }));
    dispatch(setProperty({ groupKey, key: "isStreaming", value: false }));
  };

const selectGroup =
  (guildId: string, channelId: string, groupKey: string) =>
  (state: RootState) => {
    const { newestMessage, maxMessages, isStreaming } = sub(
      state.channelVizGroups,
      groupKey,
      false
    );

    const {
      pending,
      reachedBeginning,
      isUpToDate: isUpToDate_,
      messages: messages_,
    } = MessagesSlice.sub(state.messages, guildId, channelId, false);

    const i = (newestMessage && messages_?.indexOf(newestMessage)) ?? 0;
    const j = Math.min(i + maxMessages, messages_?.length ?? 0);

    const messages = messages_?.slice(i, j);

    return {
      messages,
      isStreaming,
      isUpToDate: i === 0 && isUpToDate_,
      pending,
      reachedBeginning,
      isCreated: true,
    };
  };

export const useChannelVizGroup = (
  guildId: string,
  channelId: string,
  groupKey: string
) => {
  const group = useAppSelector(
    selectGroup(guildId, channelId, groupKey),
    ({ messages: messagesL, ...l }, { messages: messagesR, ...r }) =>
      (messagesL === messagesR ||
        !!(messagesL && messagesR && arrayEqual(messagesL, messagesR))) &&
      shallowEqual(l, r)
  );
  const dispatch = useAppDispatch();
  return {
    ...group,
    fetchOlderMessages: useCallback(
      () => dispatch(fetchOlderMessages(guildId, channelId, groupKey)),
      [channelId, dispatch, groupKey, guildId]
    ),
    fetchNewerMessages: useCallback(
      () => dispatch(fetchNewerMessages(guildId, channelId, groupKey)),
      [channelId, dispatch, groupKey, guildId]
    ),

    startStreaming: useCallback(
      () => dispatch(startStreaming(guildId, channelId, groupKey)),
      [channelId, dispatch, groupKey, guildId]
    ),
    stopStreaming: useCallback(
      () => dispatch(stopStreaming(guildId, channelId, groupKey)),
      [channelId, dispatch, groupKey, guildId]
    ),
  };
};

export default ChannelVizGroups.reducer;
