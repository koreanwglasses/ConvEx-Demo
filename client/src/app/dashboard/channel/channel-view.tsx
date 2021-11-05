import { Paper, Typography } from "@mui/material";
import { useEffect } from "react";
import { selectChannelById } from "../../data/channels-slice";
import { fetchOlderMessages, selectMessages } from "../../data/messages-slice";
import { useAppDispatch, useAppSelector } from "../../hooks";
import {
  VizGroupContainer,
  VizScrollHandler,
} from "../../viz-scroller/viz-scroller";
import {
  selectInitialOffsets,
  selectVizScrollerGroup,
} from "../../viz-scroller/viz-scroller-slice";
import { CompactChatView } from "./compact-chat-view";

export const CondensedChannelView = ({
  channelId,
  guildId,
}: {
  channelId: string;
  guildId: string;
}) => {
  const channel = useAppSelector(selectChannelById(guildId, channelId));
  const { messages, pending, reachedBeginning } =
    useAppSelector(selectMessages(guildId, channelId)) ?? {};

  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!messages && !pending) {
      dispatch(fetchOlderMessages(guildId, channelId));
    }
  }, [messages, pending, dispatch, guildId, channelId]);

  const initialOffsets = useAppSelector(selectInitialOffsets(channelId));
  const { height } = useAppSelector(selectVizScrollerGroup(channelId));

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

  return (
    <Paper
      sx={{
        width: 300,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ m: 1, fontSize: 16 }}>
        #{channel && channel.name}
      </Typography>

      <Paper sx={{ height: 400, pl: 1 }} elevation={0}>
        {messages && channel && (
          <VizGroupContainer groupKey={channelId} onScroll={onScroll}>
            <CompactChatView
              messages={messages}
              groupKey={channelId}
              guildId={guildId}
              channelId={channelId}
            />
          </VizGroupContainer>
        )}
      </Paper>
    </Paper>
  );
};
