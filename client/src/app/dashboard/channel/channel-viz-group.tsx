import React, { useEffect } from "react";
import { MessageData } from "../../../common/api-data-types";
import { fetchOlderMessages, selectMessages } from "../../data/messages-slice";
import { useAppDispatch, useAppSelector } from "../../hooks";
import {
  VizGroupContainer,
  VizScrollHandler
} from "../../viz-scroller/viz-scroller";
import {
  selectInitialOffsets,
  selectVizScrollerGroup
} from "../../viz-scroller/viz-scroller-slice";


export const ChannelVizGroup = ({
  channelId, guildId, children, groupKey,
}: {
  channelId: string;
  guildId: string;
  groupKey: string;
  children: ({
    reachedBeginning, messages, pending,
  }: {
    reachedBeginning: boolean;
    pending: boolean;
    messages?: MessageData[];
  }) => React.ReactNode;
}) => {
  const { messages, pending, reachedBeginning } = useAppSelector(selectMessages(guildId, channelId)) ?? {};

  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!messages && !pending) {
      dispatch(fetchOlderMessages(guildId, channelId));
    }
  }, [messages, pending, dispatch, guildId, channelId]);

  const initialOffsets = useAppSelector(selectInitialOffsets(channelId));
  const { height } = useAppSelector(selectVizScrollerGroup(channelId));

  const onScroll: VizScrollHandler = (e) => {
    const hasScrolledToTop = initialOffsets &&
      messages?.length &&
      e.currentTarget.scrollTop -
      initialOffsets(messages[messages.length - 1].id) <
      height;
    if (hasScrolledToTop && !pending && !reachedBeginning) {
      dispatch(fetchOlderMessages(guildId, channelId));
    }
  };
  return (
    <VizGroupContainer groupKey={groupKey} onScroll={onScroll}>
      {(pending || messages) &&
        children({ reachedBeginning, messages, pending })}
    </VizGroupContainer>
  );
};
