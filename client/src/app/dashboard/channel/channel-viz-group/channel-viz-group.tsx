import React, { createContext, useContext, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { VizGroupContainer } from "../../../viz-scroller/viz-scroller";
import {
  selectVizScrollerGroup,
  setMaxScrollOffset,
} from "../../../viz-scroller/viz-scroller-slice";
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
  const { pending, reachedBeginning, isStreaming, isUpToDate } =
    useChannelVizGroup(groupKey, guildId, channelId);

  const messages = useMessages(groupKey);
  const initialOffsets = useInitialOffsets(groupKey);
  const { height } = useAppSelector(selectVizScrollerGroup(groupKey));

  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!messages && !pending) {
      dispatch(fetchOlderMessages(groupKey));
      dispatch(startStreaming(groupKey));
    }
  }, [dispatch, groupKey, messages, pending]);

  const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    const hasScrolledToTop =
      initialOffsets &&
      messages?.length &&
      e.currentTarget.scrollTop -
        initialOffsets(messages[messages.length - 1])! <
        height;
    if (hasScrolledToTop && !pending && !reachedBeginning) {
      dispatch(fetchOlderMessages(groupKey));
    }

    const hasScrolledToBottom = e.currentTarget.scrollTop > -height;
    if (hasScrolledToBottom) {
      if (!isUpToDate) dispatch(fetchNewerMessages(groupKey));
      else if (!isStreaming) dispatch(startStreaming(groupKey));
    } else if (isStreaming) {
      dispatch(stopStreaming(groupKey));
    }
  };

  const newestMessage = messages?.length && messages[0];
  useEffect(() => {
    dispatch(clearInitialOffsets({ groupKey: groupKey }));
  }, [dispatch, groupKey, newestMessage]);

  const oldestMessageOffset =
    messages?.length && initialOffsets?.(messages[messages.length - 1]);
  // Stop scrolling when we reach the end
  useEffect(() => {
    if (!oldestMessageOffset) return;
    const maxOffset = -oldestMessageOffset + 0.5 * height;
    dispatch(setMaxScrollOffset({ key: groupKey, offset: maxOffset }));
  }, [dispatch, oldestMessageOffset, groupKey, height]);

  // Unsubscribe when hidden
  useEffect(() => {
    if (hidden && isStreaming) {
      dispatch(stopStreaming(groupKey));
    }
  }, [hidden, isStreaming, dispatch, groupKey]);

  return (
    <VizGroupContainer groupKey={groupKey} onScroll={onScroll}>
      <ChannelVizGroupContext.Provider value={{ groupKey }}>
        {children}
      </ChannelVizGroupContext.Provider>
    </VizGroupContainer>
  );
};
