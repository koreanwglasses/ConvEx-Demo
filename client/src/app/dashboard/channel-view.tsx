import { CircularProgress, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { useEffect } from "react";
import { MessageData } from "../../common/api-data-types";
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
      {messages && <VizScroller messages={messages} />}
      {lastErr && "Something went wrong"}
    </Box>
  );
};

export const VizScroller = ({ messages }: {messages: MessageData[] }) => {
  return <div style={{height: 400, overflowX: "scroll", scrollbarWidth: "none"}}>
    {messages.map((message) => <p>{message.content}</p>)}
  </div>
}