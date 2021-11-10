import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useAppDispatch } from "../../../hooks";
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
  hidden = false,
}: React.PropsWithChildren<{
  channelId: string;
  guildId: string;
  groupKey: string;
  initialLayoutKey?: string;
  hidden?: boolean;
}>) => {
  // Get state from slice
  const { pending, reachedBeginning, isStreaming, isUpToDate } =
    useChannelVizGroup(groupKey, guildId, channelId, initialLayoutKey);

  const messages = useMessages(groupKey);
  const offsets = useOffsets(groupKey);
  const { clientHeight, dScrollTop, maxScrollHeight } =
    useVizScrollerGroup(groupKey);

  const dispatch = useAppDispatch();

  const ref = useRef<HTMLDivElement>(null);

  // Do initial fetch
  useEffect(() => {
    if (!messages && !pending) {
      dispatch(fetchOlderMessages(groupKey));
      dispatch(startStreaming(groupKey));
    }
  }, [dispatch, groupKey, messages, pending]);

  let minOffset = 0;
  if (messages?.length) {
    let i = messages.length - 1;
    while (i >= 0 && typeof (minOffset = offsets(messages[i])) !== "number")
      i--;
  }

  // Load more messages on scroll
  const onScroll = useCallback(() => {
    if (dScrollTop || !ref.current || !messages?.length) return;

    const hasScrolledToTop = ref.current.scrollTop - minOffset < clientHeight;
    if (hasScrolledToTop && !pending && !reachedBeginning) {
      dispatch(fetchOlderMessages(groupKey));
    }

    const hasScrolledToBottom = ref.current.scrollTop > -clientHeight;
    if (hasScrolledToBottom) {
      if (!isUpToDate) dispatch(fetchNewerMessages(groupKey));
      else if (!isStreaming) dispatch(startStreaming(groupKey));
    } else if (isStreaming) {
      dispatch(stopStreaming(groupKey));
    }
  }, [
    dScrollTop,
    messages?.length,
    minOffset,
    clientHeight,
    pending,
    reachedBeginning,
    isStreaming,
    dispatch,
    groupKey,
    isUpToDate,
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
