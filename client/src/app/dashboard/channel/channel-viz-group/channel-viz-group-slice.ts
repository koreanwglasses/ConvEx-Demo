import { createSlice } from "@reduxjs/toolkit";
import { WritableDraft } from "immer/dist/types/types-external";
import { MessageData } from "../../../../common/api-data-types";
import { AppThunk, RootState } from "../../../store";
import * as MessagesSlice from "../../../data/messages-slice";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { shallowEqual } from "react-redux";
import { useCallback, useMemo } from "react";
import { arrayEqual } from "../../../../utils";
import {
  adjustScrollTop,
  selectVizScrollerGroup,
} from "../../../viz-scroller/viz-scroller-slice";

type LayoutModes = "map" | "compact";

interface SubState {
  guildId?: string;
  channelId?: string;

  newestMessage?: MessageData;
  maxMessages: number;
  isStreaming: boolean;
  listener?: (message: MessageData) => void;

  layout: {
    mode: LayoutModes;
    prevMode?: LayoutModes;
    isTransitioning: boolean;
    transitionOffset: number;

    offsetMap: Record<string, number>;
    offsetTopMap: Record<string, number>;
    offsetBottomMap: Record<string, number>;
    version: number;

    m: number;
    b: number;
  };

  toxicityThreshold: number;
}

// Define a type for the slice state
interface ChannelVizGroupState {
  [key: string]: SubState;
}

const sub = (state: ChannelVizGroupState, groupKey: string, write = true) => {
  const defaults = {
    isStreaming: false,
    maxMessages: 0,
    layout: {
      mode: "map",
      isTransitioning: false,
      transitionOffset: 0,

      offsetMap: {},
      offsetTopMap: {},
      offsetBottomMap: {},
      version: 0,

      m: -21,
      b: -10,
    },

    toxicityThreshold: 0,
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
    setInitialOffset(
      state,
      action: {
        payload: {
          groupKey: string;
          itemKey: string;
          offset: number;
          offsetBottom: number;
          offsetTop: number;
        };
      }
    ) {
      const {
        groupKey: key,
        itemKey,
        offset,
        offsetBottom,
        offsetTop,
      } = action.payload;
      const substate = sub(state, key);
      substate.layout.offsetMap[itemKey] = offset;
      substate.layout.offsetTopMap[itemKey] = offsetTop;
      substate.layout.offsetBottomMap[itemKey] = offsetBottom;
      substate.layout.version++;
    },
    clearInitialOffsets(state, action: { payload: { groupKey: string } }) {
      const { groupKey: key } = action.payload;
      const substate = sub(state, key);
      substate.layout.offsetMap = {};
      substate.layout.offsetTopMap = {};
      substate.layout.offsetBottomMap = {};
      substate.layout.version++;
    },
    setLayoutMode(
      state,
      action: { payload: { groupKey: string; mode: LayoutModes } }
    ) {
      const { groupKey: key, mode: type } = action.payload;
      const substate = sub(state, key);
      substate.layout.mode = type;
    },
    setTransitioning(
      state,
      action: {
        payload: {
          groupKey: string;
          mode?: LayoutModes;
          isTransitioning: boolean;
          transitionOffset?: number;
        };
      }
    ) {
      const {
        groupKey: key,
        mode,
        isTransitioning,
        transitionOffset,
      } = action.payload;
      const { layout } = sub(state, key);
      if (mode) {
        layout.prevMode = layout.mode;
        layout.mode = mode;
      }

      layout.isTransitioning = isTransitioning;

      if (typeof transitionOffset === "number")
        layout.transitionOffset = transitionOffset;
    },
    setThreshold(
      state,
      action: {
        payload: { groupKey: string; threshold: number };
      }
    ) {
      const { groupKey, threshold } = action.payload;
      sub(state, groupKey).toxicityThreshold = threshold;
    },
  },
});

const {
  setProperty,
  adjustMaxMessages,
  setInitialOffset,
  clearInitialOffsets,
  setLayoutMode,
  setTransitioning,
  setThreshold,
} = ChannelVizGroups.actions;

export {
  setInitialOffset,
  clearInitialOffsets,
  setLayoutMode,
  setTransitioning,
  setThreshold,
};

const registerGroup =
  (groupKey: string, guildId: string, channelId: string): AppThunk =>
  (dispatch) => {
    dispatch(setProperty({ groupKey, key: "guildId", value: guildId }));
    dispatch(setProperty({ groupKey, key: "channelId", value: channelId }));
  };

export const fetchOlderMessages =
  (groupKey: string): AppThunk =>
  async (dispatch, getState) => {
    const { newestMessage, maxMessages, guildId, channelId } = sub(
      getState().channelVizGroups,
      groupKey,
      false
    );
    if (!guildId || !channelId)
      throw new Error("Group must be registered before using fetch");

    const slice = MessagesSlice.sub(
      getState().messages,
      guildId,
      channelId,
      false
    );

    if (slice.reachedBeginning) return;

    const i = (newestMessage && slice.messages?.indexOf(newestMessage)) ?? 0;
    const j = i + maxMessages + 100;

    if ((slice.messages?.length ?? 0) < j && !slice.pending) {
      const messages = await dispatch(
        MessagesSlice.fetchOlderMessages(guildId, channelId)
      );

      if (messages?.length && !newestMessage)
        dispatch(
          setProperty({ groupKey, key: "newestMessage", value: messages[0] })
        );
    }

    dispatch(adjustMaxMessages({ groupKey, amount: 100 }));
  };

export const fetchNewerMessages =
  (groupKey: string, limit = 100): AppThunk =>
  async (dispatch, getState) => {
    const { newestMessage, guildId, channelId } = sub(
      getState().channelVizGroups,
      groupKey,
      false
    );
    if (!guildId || !channelId)
      throw new Error("Group must be registered before using fetch");

    const slice = MessagesSlice.sub(
      getState().messages,
      guildId,
      channelId,
      false
    );

    const i =
      ((newestMessage && slice.messages?.indexOf(newestMessage)) ?? 0) - limit;

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
      if (messages?.length) {
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

export const startStreaming =
  (groupKey: string): AppThunk =>
  (dispatch, getState) => {
    const { isStreaming, guildId, channelId } = sub(
      getState().channelVizGroups,
      groupKey,
      false
    );
    if (!guildId || !channelId)
      throw new Error("Group must be registered before using stream");
    if (isStreaming) return;

    const listener = () => {
      dispatch(fetchNewerMessages(groupKey, 1));
    };
    dispatch(MessagesSlice.subscribe(guildId, channelId, listener));
    dispatch(setProperty({ groupKey, key: "listener", value: listener }));
    dispatch(setProperty({ groupKey, key: "isStreaming", value: true }));
  };

export const stopStreaming =
  (groupKey: string): AppThunk =>
  (dispatch, getState) => {
    const { isStreaming, listener, guildId, channelId } = sub(
      getState().channelVizGroups,
      groupKey,
      false
    );
    if (!guildId || !channelId)
      throw new Error("Group must be registered before using stream");
    if (!isStreaming) return;

    dispatch(MessagesSlice.unsubscribe(guildId, channelId, listener!));
    dispatch(setProperty({ groupKey, key: "listener", value: undefined }));
    dispatch(setProperty({ groupKey, key: "isStreaming", value: false }));
  };

export const transitionLayoutMode =
  (groupKey: string, mode: LayoutModes, pivot?: MessageData): AppThunk =>
  (dispatch, getState) => {
    const messages = selectMessages(groupKey)(getState());
    const prevY = selectInitialOffsets(groupKey)(getState());
    const nextY = selectInitialOffsets(groupKey, mode)(getState());
    const { clientHeight, scrollTop } = selectVizScrollerGroup(groupKey)(
      getState()
    );

    const pivot_ =
      pivot ??
      messages?.find(
        (message) => (prevY(message) ?? 0) < scrollTop - clientHeight / 2
      );

    const transitionOffset =
      pivot_ &&
      typeof nextY(pivot_) === "number" &&
      typeof prevY(pivot_) === "number" &&
      nextY(pivot_)! - prevY(pivot_)!;

    if (typeof transitionOffset !== "number") {
      console.warn("Required positions for transition not yet computed");
      return;
    }

    dispatch(adjustScrollTop(groupKey, transitionOffset));
    dispatch(
      setTransitioning({
        groupKey,
        mode,
        isTransitioning: true,
        transitionOffset,
      })
    );
    setTimeout(() => {
      dispatch(setTransitioning({ groupKey, isTransitioning: false }));
    }, 1000);
  };

export const selectLayout = (key: string) => (state: RootState) =>
  sub(state.channelVizGroups, key, false).layout;

export const selectLayoutMode = (key: string) => (state: RootState) => {
  const { mode, isTransitioning, prevMode, transitionOffset } = sub(
    state.channelVizGroups,
    key,
    false
  ).layout;
  return { mode, isTransitioning, prevMode, transitionOffset };
};

const selectInitialOffsets =
  (key: string, mode?: LayoutModes) => (state: RootState) => {
    const initialOffsets = selectLayout(key)(state);
    const messages = selectMessages(key)(state);

    const offsetFuncs: Record<
      LayoutModes,
      (message: MessageData) => number | undefined
    > = {
      map(message: MessageData) {
        return initialOffsets.offsetMap[message.id];
      },
      compact(message: MessageData) {
        if (!messages) return;
        const i = messages.indexOf(message);
        return initialOffsets.m! * i + initialOffsets.b!;
      },
    };

    return offsetFuncs[mode ?? initialOffsets.mode];
  };

export const useInitialOffsets = (key: string, mode?: LayoutModes) => {
  const initialOffsets = useAppSelector(selectLayout(key), shallowEqual);
  const messages = useAppSelector(selectMessages(key), arrayEqual);

  const offsetFuncs: Record<
    string,
    (message: MessageData) => number | undefined
  > = useMemo(() => ({}), []);

  offsetFuncs.map = useCallback(
    (message: MessageData) => initialOffsets.offsetMap[message.id],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialOffsets.version]
  );
  offsetFuncs.compact = useCallback(
    (message: MessageData) => {
      if (!messages) return;
      const i = messages.indexOf(message);
      return initialOffsets.m! * i + initialOffsets.b!;
    },
    [initialOffsets.b, initialOffsets.m, messages]
  );

  return useMemo(
    () => offsetFuncs[mode ?? initialOffsets.mode],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, initialOffsets.mode, offsetFuncs.map, offsetFuncs.compact]
  );
};

export const selectMessages = (key: string) => (state: RootState) => {
  const group = sub(state.channelVizGroups, key, false);
  if (!group.guildId || !group.channelId || !group.newestMessage) return;

  const slice = MessagesSlice.sub(
    state.messages,
    group.guildId,
    group.channelId,
    false
  );

  const i = slice.messages?.indexOf(group.newestMessage) ?? 0;
  const j = Math.min(i + group.maxMessages, slice.messages?.length ?? 0);

  return slice.messages?.slice(i, j);
};

export const useMessages = (key: string) =>
  useAppSelector(selectMessages(key), arrayEqual);

export const selectThreshold = (key: string) => (state: RootState) =>
  sub(state.channelVizGroups, key, false).toxicityThreshold;

export const selectChannelVizGroup =
  (groupKey: string, guildId?: string, channelId?: string) =>
  (state: RootState) => {
    const {
      isStreaming,
      newestMessage,
      guildId: guildId_,
      channelId: channelId_,
    } = sub(state.channelVizGroups, groupKey, false);

    if (guildId && guildId_ && guildId !== guildId_)
      throw new Error("Guild ID in args does not match registered guild ID");
    if (channelId && channelId_ && channelId !== channelId_)
      throw new Error(
        "Channel ID in args does not match registered channel ID"
      );

    if ((!guildId_ && !guildId) || (!channelId_ && !channelId))
      throw new Error(
        "Group is not registered and guildId or channelId was not passed as args."
      );

    const {
      pending,
      reachedBeginning,
      isUpToDate: isUpToDate_,
      messages: messages_,
    } = MessagesSlice.sub(
      state.messages,
      guildId_ ?? guildId!,
      channelId_ ?? channelId!,
      false
    );

    return {
      guildId: guildId_ ?? guildId!,
      channelId: channelId_ ?? channelId!,
      isStreaming,
      isUpToDate: newestMessage === messages_?.[0] && isUpToDate_,
      pending,
      reachedBeginning,
      isRegistered: guildId_ && channelId_,
    };
  };

export const useChannelVizGroup = (
  groupKey: string,
  guildId?: string,
  channelId?: string
) => {
  const group = useAppSelector(
    selectChannelVizGroup(groupKey, guildId, channelId),
    shallowEqual
  );
  const dispatch = useAppDispatch();
  if (!group.isRegistered && guildId && channelId)
    dispatch(registerGroup(groupKey, guildId, channelId));

  return group;
};

export default ChannelVizGroups.reducer;
