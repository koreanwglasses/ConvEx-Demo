import React, { useEffect } from "react";
import { MessageData } from "../../../common/api-data-types";
import {
  disableAutoFetch,
  enableAutoFetch,
  fetchOlderMessages,
  selectMessages,
} from "../../data/messages-slice";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { VizGroupContainer } from "../../viz-scroller/viz-scroller";
import {
  clearInitialOffsets,
  selectVizScrollerGroup,
  setMaxScrollOffset,
  useInitialOffsets,
} from "../../viz-scroller/viz-scroller-slice";

export const ChannelVizGroup = ({
  channelId,
  guildId,
  children,
  groupKey,
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
}) => {
  const { messages, pending, reachedBeginning, isAutoFetching } =
    useAppSelector(selectMessages(guildId, channelId));

  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!messages && !pending) {
      dispatch(fetchOlderMessages(guildId, channelId));
    }
  }, [messages, pending, dispatch, guildId, channelId]);

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
      dispatch(fetchOlderMessages(guildId, channelId));
    }

    const hasScrolledToBottom = e.currentTarget.scrollTop > -10;
    if (hasScrolledToBottom && !isAutoFetching) {
      dispatch(enableAutoFetch(guildId, channelId));
    }
    const hasScrolledAwayFromBottom = e.currentTarget.scrollTop < -20;
    if(hasScrolledAwayFromBottom && isAutoFetching) {
      dispatch(disableAutoFetch(guildId, channelId));
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

  return (
    <VizGroupContainer groupKey={groupKey} onScroll={onScroll}>
      {(pending || messages) &&
        children({ reachedBeginning, messages, pending })}
    </VizGroupContainer>
  );
};
