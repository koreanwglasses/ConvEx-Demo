import { Paper, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { onEnterViewport } from "../../../utils";
import { fetchAnalyses } from "../../data/analyses-slice";
import { selectChannelById } from "../../data/channels-slice";
import { fetchOlder, selectMessages } from "../../data/messages-slice";
import { useAppDispatch, useAppSelector } from "../../hooks";
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

  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!messages && !pending) {
      dispatch(fetchOlder(guildId, channelId));
    }
  }, [messages, pending, dispatch, guildId, channelId]);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && messages?.length) {
      const { dispose } = onEnterViewport(ref.current, () => {
        dispatch(
          fetchAnalyses(
            messages.map((message) => ({
              guildId,
              channelId,
              messageId: message.id,
            }))
          )
        );
      });
      return dispose;
    }
  }, [messages, dispatch, guildId, channelId]);

  return (
    <Paper
      sx={{
        width: 300,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      ref={ref}
    >
      <Typography variant="h6" gutterBottom sx={{ m: 1 }}>
        #{channel && channel.name}
      </Typography>

      <Paper sx={{ height: 400, px: 1 }} elevation={0}>
        {messages && channel && (
          <CompactChatView
            messages={messages}
            groupKey={channel.id}
            guildId={guildId}
            channelId={channel.id}
          />
        )}
      </Paper>
    </Paper>
  );
};
