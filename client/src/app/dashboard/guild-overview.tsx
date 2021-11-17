import { Box } from "@mui/material";
import { useParams } from "react-router";
import { selectGuilds } from "../data/guilds-slice";
import { useAppSelector } from "../hooks";
import { selectChannels } from "../data/channels-slice";
import { ChannelCard } from "./channel/channel-card";
import React, { useEffect, useRef, useState } from "react";
import { DragDropContext, DropResult, Droppable } from "react-beautiful-dnd";
import { ChannelData } from "../../common/api-data-types";

const GuildOverview = () => {
  const { guildId } = useParams();
  const { pending: guildPending, lastError: guildLastError } =
    useAppSelector(selectGuilds);

  const {
    pending: channelsPending,
    lastError: channelsLastError,
    channelsData,
  } = useAppSelector(selectChannels(guildId!));

  const [channelPalette, setChannelPalette] = useState<ChannelData[]>();
  useEffect(() => {
    if (channelsData) setChannelPalette(Object.values(channelsData));
  }, [channelsData]);

  const [dashboard, setDashboard] = useState<ChannelData[]>([]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const item = (
      result.source.droppableId === "channel-palette"
        ? channelPalette
        : dashboard
    )!.splice(result.source.index, 1)[0];

    if (result.destination.droppableId === "channel-palette") {
      channelPalette!.splice(result.destination.index, 0, item);
      setChannelPalette([...channelPalette!]);
    } else {
      dashboard.splice(result.destination.index, 0, item);
      setDashboard([...dashboard]);
    }
  };

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
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box
          sx={{
            height: "calc(100vh - 66px)",
            width: "100vw",
            display: "flex",
          }}
        >
          {channelPalette && guildId && (
            <>
              <Droppable droppableId="channel-palette">
                {(provided) => (
                  <Box
                    sx={{
                      overflowY: "scroll",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      p: 1,
                      flexShrink: 0,
                    }}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {typeof height === "number" &&
                      channelPalette.map((channel, i) => (
                        <ChannelCard
                          key={channel.id}
                          channelId={channel.id}
                          guildId={guildId}
                          halfHeight={height / 2 - 62}
                          fullHeight={height - 73}
                          initialDisplayMode="mini"
                          initialCharts={["AnalysisSummary"]}
                          initialLayoutMode="time"
                          index={i}
                        />
                      ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
              <Box
                sx={{
                  flexGrow: 1,
                  display: "flex",
                  gap: 1,
                  overflowX: "scroll",
                  p: 1,
                }}
                ref={ref}
              >
                {typeof height === "number" && (
                  <DashboardDrop
                    guildId={guildId}
                    height={height}
                    channels={dashboard}
                  />
                )}
              </Box>
            </>
          )}
        </Box>
      </DragDropContext>
    </Box>
  );
};

const DashboardDrop = ({
  guildId,
  height,
  channels,
}: {
  guildId: string;
  height: number;
  channels: ChannelData[];
}) => {
  return (
    <Droppable droppableId={`dashboard`} direction="horizontal">
      {(provided, snapshot) => (
        <Box
          sx={{
            display: "flex",
            bgcolor: snapshot.isDraggingOver
              ? "rgba(32,156,192,0.1)"
              : "rgba(32,156,192,0)",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "flex-start",
            alignContent: "flex-start",
            flexDirection: "column",
            flexGrow: 1,
            minWidth: 336,
            transition: "background-color 0.2s",
          }}
          ref={provided.innerRef}
          {...provided.droppableProps}
        >
          {channels.map((channel, i) => (
            <ChannelCard
              key={channel.id}
              channelId={channel.id}
              guildId={guildId}
              halfHeight={height / 2 - 54}
              fullHeight={height - 57}
              index={i}
              initialExpanded
              initialDisplayMode="half"
            />
          ))}

          {provided.placeholder}
        </Box>
      )}
    </Droppable>
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
