import React, { useEffect } from "react";
import { MessageData } from "../../../../common/api-data-types";
import { useAppDispatch, useAppSelector } from "../../../hooks";
import { VizGroupContainer } from "../../../viz-scroller/viz-scroller";
import {
  clearInitialOffsets,
  selectVizScrollerGroup,
  setMaxScrollOffset,
  useInitialOffsets,
} from "../../../viz-scroller/viz-scroller-slice";
import { useChannelVizGroup } from "./channel-viz-group-slice";

export const ChannelVizGroup = ({
  channelId,
  guildId,
  children,
  groupKey,
  hidden = false,
}: {
  channelId: string;
  guildId: string;
  groupKey: string;
  children: ({
    reachedBeginning,
    messages,
    pending,
  }: {
    reachedBeginning: boolean;
    pending: boolean;
    messages?: MessageData[];
  }) => React.ReactNode;
  hidden?: boolean;
}) => {
  const {
    messages,
    pending,
    reachedBeginning,
    isStreaming,
    isUpToDate,
    fetchOlderMessages,
    fetchNewerMessages,
    startStreaming,
    stopStreaming,
  } = useChannelVizGroup(guildId, channelId, groupKey);

  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!messages && !pending) {
      fetchOlderMessages();
      startStreaming();
    }
  }, [dispatch, fetchOlderMessages, messages, pending, startStreaming]);

  const initialOffsets = useInitialOffsets(groupKey);
  const { height } = useAppSelector(selectVizScrollerGroup(groupKey));

  const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    const hasScrolledToTop =
      initialOffsets &&
      messages?.length &&
      e.currentTarget.scrollTop -
        initialOffsets(messages[messages.length - 1].id) <
        height;
    if (hasScrolledToTop && !pending && !reachedBeginning) {
      fetchOlderMessages();
    }

    const hasScrolledToBottom = e.currentTarget.scrollTop > -height;
    if (hasScrolledToBottom) {
      if (!isUpToDate) fetchNewerMessages();
      else if (!isStreaming) startStreaming();
    } else if (isStreaming) {
      stopStreaming();
    }
  };

  const newestMessage = messages?.length && messages[0];
  useEffect(() => {
    dispatch(clearInitialOffsets({ key: groupKey }));
  }, [dispatch, groupKey, newestMessage]);

  const oldestMessageOffset =
    messages?.length && initialOffsets?.(messages[messages.length - 1].id);
  // Stop scrolling when we reach the end
  useEffect(() => {
    if (!oldestMessageOffset) return;
    const maxOffset = -oldestMessageOffset + 0.5 * height;
    dispatch(setMaxScrollOffset({ key: groupKey, offset: maxOffset }));
  }, [dispatch, oldestMessageOffset, groupKey, height]);

  // Unsubscribe when hidden
  useEffect(() => {
    if (hidden && isStreaming) {
      stopStreaming();
    }
  }, [stopStreaming, hidden, isStreaming]);

  return (
    <VizGroupContainer groupKey={groupKey} onScroll={onScroll}>
      {(pending || messages) &&
        children({ reachedBeginning, messages, pending })}
    </VizGroupContainer>
  );
};
