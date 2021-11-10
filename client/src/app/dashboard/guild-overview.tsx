import { Box } from "@mui/material";
import { useParams } from "react-router";
import { selectGuilds } from "../data/guilds-slice";
import { useAppSelector } from "../hooks";
import { selectChannels } from "../data/channels-slice";
import { ChannelCard } from "./channel/channel-card";
import React, { useEffect, useRef, useState } from "react";

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
    const listener = () => {
      if (ref.current) setHeight(ref.current.clientHeight);
    };
    window.addEventListener("resize", listener);
    return window.removeEventListener("resize", listener);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ref.current && ref.current.clientHeight !== height)
      setHeight(ref.current.clientHeight);
  });

  return (
    <Box sx={{ position: "relative" }}>
      {(guildPending || channelsPending) && <StatusBar>Loading...</StatusBar>}
      {(guildLastError || channelsLastError) && (
        <StatusBar error>Something went wrong</StatusBar>
      )}
      <Box
        sx={{
          height: "calc(100vh - 66px)",
          width: "100vw",
          display: "flex",
        }}
      >
        {channels && guildId && (
          <>
            <Box
              sx={{
                overflowY: "scroll",
                display: "flex",
                flexDirection: "column",
                gap: 1,
                p: 1,
                flexShrink: 0,
              }}
            >
              {typeof height === "number" &&
                channels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channelId={channel.id}
                    guildId={guildId}
                    smallHeight={height / 2 - 66}
                    largeHeight={height - 74}
                    variant="palette"
                  />
                ))}
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                flexDirection: "column",
                alignItems: "flex-start",
                alignContent: "flex-start",
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
                    largeHeight={height - 74}
                  />
                ))}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

const StatusBar = ({
  children,
  error,
}: React.PropsWithChildren<{ error?: boolean }>) => (
  <Box
    sx={{
      position: "absolute",
      top: 0,
      px: 2,
      bgcolor: error ? "red" : "background.paper",
    }}
  >
    {children}
  </Box>
);

export default GuildOverview;
