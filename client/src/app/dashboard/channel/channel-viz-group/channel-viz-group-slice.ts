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

///////////
// STATE //
///////////

type LayoutModes = "map" | "compact";

type Layouts = Record<
  string,
  {
    offsetMap: Record<string, number>;
    offsetTopMap: Record<string, number>;
    offsetBottomMap: Record<string, number>;
    version: number;

    m: number;
    b: number;
  }
>;

interface SubState {
  guildId?: string;
  channelId?: string;

  newestMessage?: MessageData;
  maxMessages: number;
  isStreaming: boolean;
  listener?: (message: MessageData) => void;

  layouts: Layouts;
  mode: LayoutModes;
  layoutKey: string;

  prevMode?: LayoutModes;
  prevLayoutKey?: string;
  isTransitioning: boolean;
  transitionOffset: number;

  toxicityThreshold: number;
}

// Define a type for the slice state
interface ChannelVizGroupState {
  [key: string]: SubState;
}

const subLayouts = (layouts: Layouts, layoutKey: string, write = true) => {
  const defaults = {
    offsetMap: {},
    offsetTopMap: {},
    offsetBottomMap: {},
    version: 0,

    m: -21,
    b: -10,
  } as const;
  return (
    layouts[layoutKey] ?? (write ? (layouts[layoutKey] = defaults) : defaults)
  );
};

const sub = (state: ChannelVizGroupState, groupKey: string, write = true) => {
  const defaults = {
    isStreaming: false,
    maxMessages: 0,

    layouts: {},
    mode: "map",
    layoutKey: "default",

    isTransitioning: false,
    transitionOffset: 0,

    toxicityThreshold: 0,
  } as const;
  return state[groupKey] ?? (write ? (state[groupKey] = defaults) : defaults);
};

//////////////
// REDUCERS //
//////////////

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
    setOffsets(
      state,
      action: {
        payload: {
          groupKey: string;
          itemKey: string;
          offset: number;
          offsetBottom: number;
          offsetTop: number;
          layoutKey?: string;
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
      const { layouts, layoutKey: layoutKey_ } = sub(state, key);
      const { layoutKey = layoutKey_ } = action.payload;

      const layout = subLayouts(layouts, layoutKey);
      layout.offsetMap[itemKey] = offset;
      layout.offsetTopMap[itemKey] = offsetTop;
      layout.offsetBottomMap[itemKey] = offsetBottom;
      layout.version++;
    },
    clearOffsets(
      state,
      action: { payload: { groupKey: string; layoutKey?: string } }
    ) {
      const { groupKey } = action.payload;
      const { layouts, layoutKey: layoutKey_ } = sub(state, groupKey);
      const { layoutKey = layoutKey_ } = action.payload;

      const layout = subLayouts(layouts, layoutKey);
      layout.offsetMap = {};
      layout.offsetTopMap = {};
      layout.offsetBottomMap = {};
      layout.version++;
    },
    setLayoutMode(
      state,
      action: {
        payload: { groupKey: string; mode: LayoutModes; layoutKey?: string };
      }
    ) {
      const { groupKey: key, mode } = action.payload;
      sub(state, key).mode = mode;
    },
    setTransitioning(
      state,
      action: {
        payload: {
          groupKey: string;
          mode?: LayoutModes;
          isTransitioning: boolean;
          transitionOffset?: number;
          layoutKey?: string;
        };
      }
    ) {
      const {
        groupKey: key,
        isTransitioning,
        transitionOffset,
        layoutKey,
        mode,
      } = action.payload;
      const substate = sub(state, key);

      if (mode) {
        substate.prevMode = substate.mode;
        substate.mode = mode;
      }

      if (layoutKey) {
        substate.prevLayoutKey = substate.layoutKey;
        substate.layoutKey = layoutKey;
      }

      substate.isTransitioning = isTransitioning;

      if (typeof transitionOffset === "number")
        substate.transitionOffset = transitionOffset;
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
    setLayoutKey(
      state,
      action: { payload: { groupKey: string; layoutKey: string } }
    ) {
      const { groupKey, layoutKey } = action.payload;
      sub(state, groupKey).layoutKey = layoutKey;
    },
  },
});

const {
  setProperty,
  adjustMaxMessages,
  setOffsets,
  clearOffsets,
  setLayoutMode,
  setTransitioning,
  setThreshold,
  setLayoutKey,
} = ChannelVizGroups.actions;

export {
  setOffsets,
  clearOffsets,
  setLayoutMode,
  setTransitioning,
  setThreshold,
  setLayoutKey,
};

/////////////
// ACTIONS //
/////////////

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

export const transitionLayout =
  ({ groupKey, mode, layoutKey, pivot }: { groupKey: string; mode?: LayoutModes; layoutKey?: string, pivot?: MessageData; }): AppThunk =>
  (dispatch, getState) => {
    const messages = selectMessages(groupKey)(getState());
    const prevY = selectOffsets(groupKey)(getState());
    const nextY = selectOffsets(groupKey, mode, layoutKey)(getState());
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

///////////////
// SELECTORS //
///////////////

export const selectLayoutData =
  (key: string, layoutKey?: string) => (state: RootState) => {
    const { layouts, layoutKey: layoutKey_ } = sub(
      state.channelVizGroups,
      key,
      false
    );
    return {
      ...subLayouts(layouts, layoutKey ?? layoutKey_, false),
      layoutKey: layoutKey ?? layoutKey_,
    };
  };

// Return fewer items for optimization with useSelector(..., shallowEqual)
export const selectLayoutMode = (key: string) => (state: RootState) => {
  const { mode, isTransitioning, prevMode, transitionOffset, layoutKey } = sub(
    state.channelVizGroups,
    key,
    false
  );

  return { mode, isTransitioning, prevMode, transitionOffset, layoutKey };
};

const selectOffsets =
  (key: string, mode?: LayoutModes, layoutKey?: string) =>
  (state: RootState) => {
    const layoutMode = selectLayoutMode(key)(state);
    const layoutData = selectLayoutData(key, layoutKey)(state);
    const messages = selectMessages(key)(state);

    const offsetFuncs: Record<
      LayoutModes,
      (message: MessageData) => number | undefined
    > = {
      map(message: MessageData) {
        return layoutData.offsetMap[message.id];
      },
      compact(message: MessageData) {
        if (!messages) return;
        const i = messages.indexOf(message);
        return layoutData.m! * i + layoutData.b!;
      },
    };

    return offsetFuncs[mode ?? layoutMode.mode];
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

///////////
// HOOKS //
///////////

export const useOffsets = (
  key: string,
  mode?: LayoutModes,
  layoutKey?: string
) => {
  const layoutMode = useAppSelector(selectLayoutMode(key), shallowEqual);
  const layoutData = useAppSelector(
    selectLayoutData(key, layoutKey),
    shallowEqual
  );
  const messages = useAppSelector(selectMessages(key), arrayEqual);

  const map = useCallback(
    (message: MessageData) => layoutData.offsetMap[message.id],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutData.offsetMap, layoutData.version]
  );
  const compact = useCallback(
    (message: MessageData) => {
      const i = messages!.indexOf(message);
      return layoutData.m * i + layoutData.b!;
    },
    [layoutData.b, layoutData.m, messages]
  );

  const offsetFuncs = useMemo(() => ({ map, compact }), [compact, map]);

  return useMemo(
    () => offsetFuncs[mode ?? layoutMode.mode],
    [offsetFuncs, mode, layoutMode.mode]
  );
};

export const useMessages = (key: string) =>
  useAppSelector(selectMessages(key), arrayEqual);

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
