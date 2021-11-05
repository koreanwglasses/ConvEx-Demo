import React, { useEffect } from "react";
import { MessageData } from "../../../common/api-data-types";
import { fetchOlderMessages, selectMessages } from "../../data/messages-slice";
import { useAppDispatch, useAppSelector } from "../../hooks";
import {
  VizGroupContainer,
  VizScrollHandler,
} from "../../viz-scroller/viz-scroller";
import {
  selectInitialOffsets,
  selectVizScrollerGroup,
  setMaxScrollOffset,
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
  const { messages, pending, reachedBeginning } =
    useAppSelector(selectMessages(guildId, channelId)) ?? {};

  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!messages && !pending) {
      dispatch(fetchOlderMessages(guildId, channelId));
    }
  }, [messages, pending, dispatch, guildId, channelId]);

  const initialOffsets = useAppSelector(selectInitialOffsets(groupKey));
  const { height, maxScrollOffset } = useAppSelector(
    selectVizScrollerGroup(groupKey)
  );

  const onScroll: VizScrollHandler = (e) => {
    const hasScrolledToTop =
      initialOffsets &&
      messages?.length &&
      e.currentTarget.scrollTop -
        initialOffsets(messages[messages.length - 1].id) <
        height;
    if (hasScrolledToTop && !pending && !reachedBeginning) {
      dispatch(fetchOlderMessages(guildId, channelId));
    }
  };

  // Stop scrolling when we reach the end

  useEffect(() => {
    if (
      reachedBeginning &&
      messages?.length &&
      !maxScrollOffset &&
      initialOffsets
    ) {
      const firstMessageOffset = initialOffsets(
        messages[messages.length - 1].id
      );
      if (!firstMessageOffset) return;
      const newMaxOffset = -firstMessageOffset + 0.5 * height;
      dispatch(setMaxScrollOffset({ key: groupKey, offset: newMaxOffset }));
    }
  }, [
    reachedBeginning,
    messages,
    maxScrollOffset,
    initialOffsets,
    dispatch,
    height,
    groupKey,
  ]);

  return (
    <VizGroupContainer groupKey={groupKey} onScroll={onScroll}>
      {(pending || messages) &&
        children({ reachedBeginning, messages, pending })}
    </VizGroupContainer>
  );
};
