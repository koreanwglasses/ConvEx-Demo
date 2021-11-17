import { createSlice } from "@reduxjs/toolkit";
import { WritableDraft } from "immer/dist/types/types-external";
import { Interval, MessageData } from "../../../../common/api-data-types";
import { AppThunk, RootState } from "../../../store";
import * as MessagesSlice from "../../../data/messages-slice";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { shallowEqual } from "react-redux";
import { useMemo } from "react";
import { deepEqual, getTimeInterval } from "../../../../utils";
import {
  adjustScrollTop,
  selectVizScrollerGroup,
} from "../../../viz-scroller/viz-scroller-slice";

///////////
// STATE //
///////////

export type LayoutMode = "map" | "compact" | "time";

type Layouts = Record<
  string,
  {
    offsetMap: Record<string, number>;
    offsetTopMap: Record<string, number>;
    offsetBottomMap: Record<string, number>;
    offsetMapVersion: number;

    m: number;
    b: number;

    baseTime: Date;
    timeScale: number;
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
  mode: LayoutMode;
  layoutKey: string;

  prevMode?: LayoutMode;
  prevLayoutKey?: string;
  isTransitioning: boolean;
  transitionOffset: number;

  toxicityThreshold: number;

  summaryInterval: {
    interval: Interval;
    step: number;
  };
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
    offsetMapVersion: 0,

    m: -21,
    b: -10,

    baseTime: new Date(Date.now()),
    timeScale: -32 / (1000 * 60 * 60),
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

    summaryInterval: {
      interval: "hour",
      step: 1,
    },
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
      layout.offsetMapVersion++;
    },
    clearOffsets(state, action: { payload: { groupKey: string } }) {
      const { groupKey } = action.payload;
      const { layouts } = sub(state, groupKey);

      for (const layoutKey in layouts) {
        const layout = layouts[layoutKey];
        layout.offsetMap = {};
        layout.offsetTopMap = {};
        layout.offsetBottomMap = {};
        layout.offsetMapVersion++;
      }
    },
    setLayoutKey(
      state,
      action: { payload: { groupKey: string; layoutKey: string } }
    ) {
      const { groupKey, layoutKey } = action.payload;
      sub(state, groupKey).layoutKey = layoutKey;
    },
    setLayoutMode(
      state,
      action: {
        payload: { groupKey: string; mode: LayoutMode };
      }
    ) {
      const { groupKey: key, mode } = action.payload;
      sub(state, key).mode = mode;
    },
    setTransition(
      state,
      action: {
        payload: {
          groupKey: string;
          mode?: LayoutMode;
          layoutKey?: string;
          isTransitioning: boolean;
          transitionOffset?: number;
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
    setBaseTime(
      state,
      action: {
        payload: { groupKey: string; layoutKey?: string; baseTime?: Date };
      }
    ) {
      const { groupKey: key, baseTime = new Date(Date.now()) } = action.payload;
      const { layouts, layoutKey: layoutKey_ } = sub(state, key);
      const { layoutKey = layoutKey_ } = action.payload;

      const layout = subLayouts(layouts, layoutKey);
      layout.baseTime = baseTime;
    },
  },
});

const {
  setProperty,
  adjustMaxMessages,
  setOffsets,
  clearOffsets,
  setLayoutKey,
  setLayoutMode,
  setTransition,
  setThreshold,
  setBaseTime,
} = ChannelVizGroups.actions;

export {
  setOffsets,
  clearOffsets,
  setLayoutMode,
  setLayoutKey,
  setThreshold,
  setBaseTime,
};

/////////////
// ACTIONS //
/////////////

const registerGroup =
  (
    groupKey: string,
    guildId: string,
    channelId: string,
    initialLayoutKey = "default",
    initialLayoutMode: LayoutMode = "map"
  ): AppThunk =>
  (dispatch) => {
    dispatch(setProperty({ groupKey, key: "guildId", value: guildId }));
    dispatch(setProperty({ groupKey, key: "channelId", value: channelId }));
    dispatch(setLayoutKey({ groupKey, layoutKey: initialLayoutKey }));
    dispatch(setLayoutMode({ groupKey, mode: initialLayoutMode }));
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
      await dispatch(MessagesSlice.fetchOlderMessages(guildId, channelId));
    }

    if (slice.messages?.length && !newestMessage)
      dispatch(
        setProperty({
          groupKey,
          key: "newestMessage",
          value: slice.messages[0],
        })
      );

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
        dispatch(clearOffsets({ groupKey }));
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

export const transitionLayouts =
  ({
    groupKey,
    mode: mode_,
    layoutKey,
    pivot: pivot_,
    smooth = true,
  }: {
    groupKey: string;
    mode?: LayoutMode;
    layoutKey?: string;
    pivot?: MessageData;
    smooth?: boolean;
  }): AppThunk =>
  (dispatch, getState) => {
    const mode = mode_ ?? selectLayoutMode(groupKey)(getState()).mode;

    const messages = selectMessages(groupKey)(getState());
    const prevY = selectOffsetFuncs(groupKey)(getState())[mode];
    const nextY = selectOffsetFuncs(groupKey, layoutKey)(getState())[mode];
    const { clientHeight, scrollTop } = selectVizScrollerGroup(groupKey)(
      getState()
    );

    const pivot =
      pivot_ ??
      messages?.find(
        (message) => (prevY(message) ?? 0) < scrollTop - clientHeight / 2
      );

    const transitionOffset = pivot && nextY(pivot) - prevY(pivot);
    if (typeof transitionOffset !== "number" || isNaN(transitionOffset)) {
      console.warn("Could not determine transitionOffset. Scrolling to bottom");
      dispatch(adjustScrollTop(groupKey, -scrollTop));
    } else {
      dispatch(adjustScrollTop(groupKey, transitionOffset));
    }

    if (smooth) {
      dispatch(
        setTransition({
          groupKey,
          mode,
          layoutKey,
          transitionOffset,
          isTransitioning: true,
        })
      );
      setTimeout(() => {
        dispatch(setTransition({ groupKey, isTransitioning: false }));
      }, 1000);
    } else {
      layoutKey && dispatch(setLayoutKey({ groupKey, layoutKey }));
      mode && dispatch(setLayoutMode({ groupKey, mode }));
    }
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

export const selectBaseTime =
  (groupKey: string, layoutKey?: string) => (state: RootState) => {
    const { interval, step } = selectSummaryInterval(groupKey)(state);
    const layoutData = selectLayoutData(groupKey, layoutKey)(state);
    const timeInterval = getTimeInterval(interval, step);
    return +timeInterval.ceil(layoutData.baseTime);
  };

export const selectOffsetFuncs =
  (groupKey: string, layoutKey?: string) => (state: RootState) => {
    const layoutData = selectLayoutData(groupKey, layoutKey)(state);
    const messages = selectMessages(groupKey)(state);
    const baseTime = selectBaseTime(groupKey, layoutKey)(state);

    const offsetFuncs = {
      map: Object.assign(
        function (message: MessageData) {
          return layoutData.offsetMap[message.id];
        },
        {
          inverse(offset: number): number {
            throw new Error("Not implemented");
          },
        }
      ),
      compact: Object.assign(
        function (message: MessageData) {
          const i = messages!.indexOf(message);
          return layoutData.m * i + layoutData.b;
        },
        {
          inverse(offset: number) {
            return offset - layoutData.b / layoutData.m;
          },
        }
      ),
      time: Object.assign(
        function (message: MessageData) {
          return (message.createdTimestamp - baseTime) * layoutData.timeScale;
        },
        {
          inverse(offset: number) {
            return offset / layoutData.timeScale + baseTime;
          },
        }
      ),
    };

    return offsetFuncs;
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

export const selectSummaryInterval = (groupKey: string) => (state: RootState) =>
  sub(state.channelVizGroups, groupKey, false).summaryInterval;

///////////
// HOOKS //
///////////

export const useOffsets = (
  groupKey: string,
  mode?: LayoutMode,
  layoutKey?: string
) => {
  const layoutMode = useAppSelector(selectLayoutMode(groupKey), shallowEqual);
  const layoutData = useAppSelector(
    selectLayoutData(groupKey, layoutKey),
    shallowEqual
  );
  const messages = useAppSelector(selectMessages(groupKey), deepEqual);
  const offsetFuncs = useAppSelector(selectOffsetFuncs(groupKey));
  const summaryInterval = useAppSelector(
    selectSummaryInterval(groupKey),
    deepEqual
  );

  const baseTime = useAppSelector(
    selectBaseTime(groupKey, layoutKey),
    deepEqual
  );

  const map = useMemo(
    () => offsetFuncs.map,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutData.offsetMapVersion]
  );

  const compact = useMemo(
    () => offsetFuncs.compact,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutData.b, layoutData.m, messages]
  );

  const time = useMemo(
    () => offsetFuncs.time,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      baseTime,
      layoutData.timeScale,
      summaryInterval.step,
      summaryInterval.interval,
    ]
  );

  return useMemo(
    () => ({ map, compact, time }[mode ?? layoutMode.mode]),
    [map, compact, time, mode, layoutMode.mode]
  );
};

export const useMessages = (key: string) =>
  useAppSelector(selectMessages(key), deepEqual());

export const useChannelVizGroup = (
  groupKey: string,
  guildId?: string,
  channelId?: string,
  initialLayoutKey?: string,
  initialLayoutMode?: LayoutMode
) => {
  const group = useAppSelector(
    selectChannelVizGroup(groupKey, guildId, channelId),
    shallowEqual
  );
  const dispatch = useAppDispatch();
  if (!group.isRegistered && guildId && channelId)
    dispatch(
      registerGroup(
        groupKey,
        guildId,
        channelId,
        initialLayoutKey,
        initialLayoutMode
      )
    );

  return group;
};

export default ChannelVizGroups.reducer;
