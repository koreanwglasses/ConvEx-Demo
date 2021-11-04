import { CircularProgress, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { useEffect } from "react";
import { selectChannelById } from "../data/channels-slice";
import { fetchOlder, selectMessages } from "../data/messages-slice";
import { useAppDispatch, useAppSelector } from "../hooks";

export const CondensedChannelView = ({
  channelId,
  guildId,
}: {
  channelId: string;
  guildId: string;
}) => {
  const channel = useAppSelector(selectChannelById(guildId, channelId));
  const { messages, pending, lastErr } =
    useAppSelector(selectMessages(guildId, channelId)) ?? {};

  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!messages && !pending) {
      dispatch(fetchOlder(guildId, channelId));
    }
  }, [messages, pending, dispatch, guildId, channelId]);

  return (
    <Box>
      <Typography variant="h6">{channel && channel.name}</Typography>
      {pending && <CircularProgress />}
      {messages && messages.map((message) => <p>{message.content}</p>)}
      {lastErr && "Something went wrong"}
    </Box>
  );
};
