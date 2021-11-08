import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useAppDispatch } from "../../../hooks";
import { VizGroupContainer } from "../../../viz-scroller/viz-scroller";
import { useVizScrollerGroup } from "../../../viz-scroller/viz-scroller-slice";
import {
  clearInitialOffsets,
  fetchNewerMessages,
  fetchOlderMessages,
  startStreaming,
  stopStreaming,
  useChannelVizGroup,
  useInitialOffsets,
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
  hidden = false,
}: React.PropsWithChildren<{
  channelId: string;
  guildId: string;
  groupKey: string;
  hidden?: boolean;
}>) => {
  // Get state from slice
  const { pending, reachedBeginning, isStreaming, isUpToDate } =
    useChannelVizGroup(groupKey, guildId, channelId);

  const messages = useMessages(groupKey);
  const initialOffsets = useInitialOffsets(groupKey);
  const { clientHeight, dScrollTop } = useVizScrollerGroup(groupKey);

  const dispatch = useAppDispatch();

  const ref = useRef<HTMLDivElement>(null);

  // Do initial fetch
  useEffect(() => {
    if (!messages && !pending) {
      dispatch(fetchOlderMessages(groupKey));
      dispatch(startStreaming(groupKey));
    }
  }, [dispatch, groupKey, messages, pending]);

  // Load more messages on scroll
  const onScroll = useCallback(() => {
    if (dScrollTop) return;

    const hasScrolledToTop =
      initialOffsets &&
      messages?.length &&
      ref.current!.scrollTop - initialOffsets(messages[messages.length - 1])! <
        clientHeight;
    if (hasScrolledToTop && !pending && !reachedBeginning) {
      dispatch(fetchOlderMessages(groupKey));
    }

    const hasScrolledToBottom = ref.current!.scrollTop > -clientHeight;
    if (hasScrolledToBottom) {
      if (!isUpToDate) dispatch(fetchNewerMessages(groupKey));
      else if (!isStreaming) dispatch(startStreaming(groupKey));
    } else if (isStreaming) {
      dispatch(stopStreaming(groupKey));
    }
  }, [
    clientHeight,
    dScrollTop,
    dispatch,
    groupKey,
    initialOffsets,
    isStreaming,
    isUpToDate,
    messages,
    pending,
    reachedBeginning,
  ]);

  // Clear/recompute offsets when new message is inserted
  const newestMessage = messages?.length && messages[0];
  useEffect(() => {
    dispatch(clearInitialOffsets({ groupKey }));
  }, [dispatch, groupKey, newestMessage]);

  // Stop scrolling when we reach the end
  // const oldestMessageOffset =
  //   messages?.length && initialOffsets(messages[messages.length - 1]);
  // useEffect(() => {
  //   if (!oldestMessageOffset) return;
  //   const maxOffset = -oldestMessageOffset + 0.5 * clientHeight;
  //   dispatch(setMaxScrollHeight({ key: groupKey, offset: maxOffset }));
  // }, [clientHeight, dispatch, groupKey, oldestMessageOffset]);

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
