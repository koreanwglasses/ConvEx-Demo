import { Box } from "@mui/material";
import { useParams } from "react-router";
import { selectGuilds } from "../data/guilds-slice";
import { useAppSelector } from "../hooks";
import { selectChannels } from "../data/channels-slice";
import { ChannelCard } from "./channel/channel-card";
import { useEffect, useRef, useState } from "react";

const GuildOverview = () => {
  const { guildId } = useParams();
  const { pending: guildPending, lastError: guildLastError } =
    useAppSelector(selectGuilds);

  const {
    pending: channelsPending,
    lastError: channelsLastError,
    channelsData,
  } = useAppSelector(selectChannels(guildId!));

  const channels = channelsData && Object.values(channelsData);

  const [height, setHeight] = useState<number>();

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof height === "undefined" && ref.current)
      setHeight(ref.current.clientHeight);
  }, [height, setHeight]);

  useEffect(() => {
    const listener = () => {
      if (ref.current) setHeight(ref.current.clientHeight);
    };
    window.addEventListener("resize", listener);
    return window.removeEventListener("resize", listener);
  }, [setHeight]);

  return (
    <Box>
      {(guildPending || channelsPending) && "Loading..."}
      {(guildLastError || channelsLastError) && "Something went wrong"}

      {channels && guildId && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            flexDirection: "column",
            alignItems: "flex-start",
            alignContent: "flex-start",
            height: "calc(100vh - 66px)",
            width: "100vw",
            overflowX: "scroll",
            p: 2,
          }}
          ref={ref}
        >
          {typeof height === "number" &&
            channels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channelId={channel.id}
                guildId={guildId}
                smallHeight={height / 2 - 66}
                largeHeight={height - 32}
              />
            ))}
        </Box>
      )}
    </Box>
  );
};

export default GuildOverview;
