import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { shallowEqual } from "react-redux";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { VizGroupContainer } from "../../../viz-scroller/viz-scroller";
import {
  setMaxScrollHeight,
  useVizScrollerGroup,
} from "../../../viz-scroller/viz-scroller-slice";
import {
  clearOffsets,
  fetchNewerMessages,
  fetchOlderMessages,
  startStreaming,
  stopStreaming,
  useChannelVizGroup,
  useOffsets,
  useMessages,
  selectLayoutMode,
  LayoutMode,
  setBaseTime,
} from "./channel-viz-group-slice";

const ChannelVizGroupContext = createContext<{ groupKey: string }>({
  groupKey: "",
});
export const useGroupKey = () => useContext(ChannelVizGroupContext).groupKey;

export const ChannelVizGroup = ({
  channelId,
  guildId,
  children,
  groupKey,
  initialLayoutKey,
  initialLayoutMode,
  hidden = false,
}: React.PropsWithChildren<{
  channelId: string;
  guildId: string;
  groupKey: string;
  initialLayoutKey?: string;
  initialLayoutMode?: LayoutMode;
  hidden?: boolean;
}>) => {
  // Get state from slice
  const { pending, reachedBeginning, isStreaming, isUpToDate } =
    useChannelVizGroup(
      groupKey,
      guildId,
      channelId,
      initialLayoutKey,
      initialLayoutMode
    );
  const { mode } = useAppSelector(selectLayoutMode(groupKey), shallowEqual);

  const messages = useMessages(groupKey);
  const offsets = useOffsets(groupKey);
  const { clientHeight, dScrollTop, maxScrollHeight } =
    useVizScrollerGroup(groupKey);

  const dispatch = useAppDispatch();

  const ref = useRef<HTMLDivElement>(null);

  const tickTimeout = useRef<NodeJS.Timeout>();
  const startTickLoop = useCallback(() => {
    if (tickTimeout.current) {
      clearTimeout(tickTimeout.current);
      tickTimeout.current = undefined;
    }
    dispatch(setBaseTime({ groupKey }));
    tickTimeout.current = setTimeout(startTickLoop, 1000);
  }, [dispatch, groupKey]);

  const stopTickLoop = useCallback(() => {
    if (tickTimeout.current) clearTimeout(tickTimeout.current);
  }, []);

  useEffect(() => {
    startTickLoop();
  }, [startTickLoop]);

  // Do initial fetch
  useEffect(() => {
    if (!messages && !pending && mode !== "time") {
      dispatch(fetchOlderMessages(groupKey));
      dispatch(startStreaming(groupKey));
    }
  }, [dispatch, groupKey, messages, mode, pending, startTickLoop]);

  let minOffset = 0;
  if (messages?.length) {
    let i = messages.length - 1;
    while (i >= 0 && typeof (minOffset = offsets(messages[i])) !== "number")
      i--;
  }

  // Load more data on scroll
  const onScroll = useCallback(() => {
    if (dScrollTop || !ref.current || !messages?.length || mode === "time")
      return;

    const hasScrolledToTop = ref.current.scrollTop - minOffset < clientHeight;
    if (hasScrolledToTop && !pending && !reachedBeginning) {
      dispatch(fetchOlderMessages(groupKey));
    }

    const hasScrolledToBottom = ref.current.scrollTop > -clientHeight;
    if (hasScrolledToBottom) {
      startTickLoop();
      if (!isUpToDate) dispatch(fetchNewerMessages(groupKey));
      else if (!isStreaming) dispatch(startStreaming(groupKey));
    } else {
      stopTickLoop();
      if (isStreaming) {
        dispatch(stopStreaming(groupKey));
      }
    }
  }, [
    dScrollTop,
    messages?.length,
    mode,
    minOffset,
    clientHeight,
    pending,
    reachedBeginning,
    dispatch,
    groupKey,
    startTickLoop,
    isUpToDate,
    isStreaming,
    stopTickLoop,
  ]);

  // Clear/recompute offsets when new message is inserted
  const newestMessage = messages?.length && messages[0];
  useEffect(() => {
    dispatch(clearOffsets({ groupKey }));
  }, [dispatch, groupKey, newestMessage]);

  // Stop scrolling when we reach the end
  useEffect(() => {
    const newMax = -minOffset + 0.5 * clientHeight;
    if (!maxScrollHeight || newMax > maxScrollHeight) {
      dispatch(setMaxScrollHeight({ key: groupKey, offset: newMax }));
    }
  }, [clientHeight, dispatch, groupKey, maxScrollHeight, minOffset]);

  // Stop streaming when hidden
  useEffect(() => {
    if (hidden && isStreaming) {
      dispatch(stopStreaming(groupKey));
    }
  }, [hidden, isStreaming, dispatch, groupKey]);

  return (
    <VizGroupContainer groupKey={groupKey} onScroll={onScroll} ref={ref}>
      <ChannelVizGroupContext.Provider value={{ groupKey }}>
        {children}
      </ChannelVizGroupContext.Provider>
    </VizGroupContainer>
  );
};
