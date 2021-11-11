import { Box } from "@mui/material";
import { useParams } from "react-router";
import { selectGuilds } from "../data/guilds-slice";
import { useAppSelector } from "../hooks";
import { selectChannels } from "../data/channels-slice";
import { ChannelCard } from "./channel/channel-card";
import React, { useEffect, useRef, useState } from "react";
import {
  DragDropContext,
  DropResult,
  ResponderProvided,
  Droppable,
} from "react-beautiful-dnd";
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

  const [dashboardColumns, setDashboardColumns] = useState<ChannelData[][]>([
    [],
  ]);

  const handleDragEnd = (result: DropResult, provided: ResponderProvided) => {
    if (!result.destination) return;

    const cell = (droppableId: string) => {
      const [, i] = droppableId.match(/-(\d+)$/)!;
      return +i;
    };

    const item =
      result.source.droppableId === "channel-palette"
        ? channelPalette!.splice(result.source.index, 1)[0]
        : dashboardColumns[cell(result.source.droppableId)].splice(
            result.source.index,
            1
          )[0];

    if (result.destination.droppableId === "channel-palette") {
      channelPalette!.splice(result.destination.index, 0, item);
      setChannelPalette([...channelPalette!]);
    } else {
      const i = cell(result.destination.droppableId);
      dashboardColumns[i].splice(result.destination.index, 0, item);
    }

    setDashboardColumns([
      ...dashboardColumns.filter((channels) => channels.length),
      [],
    ]);
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
                {(provided, snapshot) => (
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
                          defaultDisplayMode="mini"
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
                  flexDirection: "column",
                  flexWrap: "wrap",
                  alignContent: "flex-start",
                }}
                ref={ref}
              >
                {typeof height === "number" &&
                  dashboardColumns.map((channels, i) => (
                    <DashboardCell
                      index={i}
                      key={i}
                      last={i === dashboardColumns.length - 1}
                      guildId={guildId}
                      height={height}
                      channels={channels}
                    />
                  ))}
              </Box>
            </>
          )}
        </Box>
      </DragDropContext>
    </Box>
  );
};

const DashboardCell = ({
  guildId,
  height,
  index,
  channels,
  last,
}: {
  guildId: string;
  height: number;
  index: number;
  channels: ChannelData[];
  last: boolean;
}) => {
  return (
    <Droppable droppableId={`dashboard-cell-${index}`} direction="horizontal">
      {(provided, snapshot) => (
        <Box
          sx={{
            display: "flex",
            bgcolor: snapshot.isDraggingOver
              ? "rgba(32,156,192,0.2)"
              : "rgba(32,156,192,0)",
            gap: 1,
            minWidth: 336,
            flexGrow: last ? 1 : 0,
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
              defaultExpanded
              defaultDisplayMode="half"
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
