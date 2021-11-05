import { Paper, Typography } from "@mui/material";
import { useEffect } from "react";
import { selectChannelById } from "../../data/channels-slice";
import { fetchOlder, selectMessages } from "../../data/messages-slice";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { VizGroupContainer } from "../../viz-scroller/viz-scroller";
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
  const { messages, pending } =
    useAppSelector(selectMessages(guildId, channelId)) ?? {};

  const initialOffsets = useAppSelector(selectInitialOffsets(channelId));
  const { offset } = useAppSelector(selectVizScrollerGroup(channelId));
  // const hasScrolledToTop = messages &&

  // console.log(
  //   messages && (initialOffsets?.(messages[messages.length - 1].id) ?? 0)
  // );

  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!messages && !pending) {
      dispatch(fetchOlder(guildId, channelId));
    }
  }, [messages, pending, dispatch, guildId, channelId]);

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

          <VizGroupContainer groupKey={channelId}>
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
