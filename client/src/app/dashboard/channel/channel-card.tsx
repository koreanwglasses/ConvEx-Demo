import {
  Add,
  BarChart,
  CloseFullscreen,
  ExpandLess,
  ExpandMore,
  Feed,
  OpenInFull,
} from "@mui/icons-material";
import {
  ButtonBase,
  Card,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Box } from "@mui/system";
import React, { useEffect, useRef, useState } from "react";
import { shallowEqual } from "react-redux";
import { MessageData } from "../../../common/api-data-types";
import TransitionContainer from "../../components/ui/transition-container";
import { selectChannelById } from "../../data/channels-slice";
import { useAppDispatch, useAppSelector } from "../../hooks";
import {
  selectVizScrollerGroup,
  setClientHeight,
} from "../../viz-scroller/viz-scroller-slice";
import { AnalysisBars } from "./analysis-bars";
import { ChannelVizGroup } from "./channel-viz-group/channel-viz-group";
import {
  selectLayoutMode,
  transitionLayouts,
} from "./channel-viz-group/channel-viz-group-slice";
import { CompactChatView } from "./compact-chat-view";
import { Draggable } from "react-beautiful-dnd";
import { ActivityVolume } from "./activity-volume";

export const ChannelCard = ({
  channelId,
  guildId,
  halfHeight,
  fullHeight,
  miniHeight = halfHeight * 0.75,
  defaultDisplayMode = "half",
  defaultExpanded = false,
  index,
}: {
  channelId: string;
  guildId: string;
  miniHeight?: number;
  halfHeight: number;
  fullHeight: number;
  defaultDisplayMode?: "mini" | "half" | "full";
  index: number;
  defaultExpanded?: boolean;
}) => {
  const groupKey = `${channelId}`;

  const dispatch = useAppDispatch();
  const channel = useAppSelector(selectChannelById(guildId, channelId));
  const { clientHeight } = useAppSelector(
    selectVizScrollerGroup(groupKey),
    shallowEqual
  );
  const { mode: layoutMode } = useAppSelector(
    selectLayoutMode(groupKey),
    shallowEqual
  );

  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);
  useEffect(() => {
    if (expanded && !loaded) setLoaded(true);
  }, [expanded, loaded]);

  const [displayMode, setDisplayMode] = useState(defaultDisplayMode);
  const chartWidth = { mini: 200, half: 300, full: 400 }[displayMode];
  const chartHeight = { mini: miniHeight, half: halfHeight, full: fullHeight }[
    displayMode
  ];
  useEffect(() => {
    if (chartHeight !== clientHeight) {
      dispatch(setClientHeight({ key: groupKey, height: chartHeight }));
    }
  }, [chartHeight, clientHeight, dispatch, groupKey]);

  const handleToggleMaximized = () => {
    const newDisplayMode = displayMode === "full" ? "half" : "full";
    setDisplayMode(newDisplayMode);
    if (!expanded) setExpanded(true);

    dispatch(
      transitionLayouts({
        groupKey,
        layoutKey: newDisplayMode,
        smooth: false,
      })
    );
  };

  type ChartType = "CompactChatView" | "AnalysisBars" | "ActivityVolume";
  const [charts, setCharts] = useState<ChartType[]>(["CompactChatView"]);

  const handleChartChanged = (
    e: unknown,
    value: ChartType[],
    pivot?: MessageData
  ) => {
    const newCharts = displayMode === "mini" ? value.slice(-1) : value;

    const wasChatOpen = charts.includes("CompactChatView");
    const isChatOpen = newCharts.includes("CompactChatView");
    setCharts(newCharts);

    if (wasChatOpen && !isChatOpen && layoutMode !== "compact")
      dispatch(transitionLayouts({ groupKey, mode: "compact", pivot }));
    if (!wasChatOpen && isChatOpen && layoutMode !== "map")
      dispatch(transitionLayouts({ groupKey, mode: "map", pivot }));
  };

  // Workaround for callback not updating in component
  const handleDoubleClickBar = useRef<(message: MessageData) => void>();
  handleDoubleClickBar.current = (message: MessageData) => {
    if (charts.includes("CompactChatView"))
      handleChartChanged(
        undefined,
        charts.filter((chart) => chart !== "CompactChatView"),
        message
      );
    else handleChartChanged(undefined, [...charts, "CompactChatView"], message);
  };

  return (
    <Draggable draggableId={groupKey} index={index}>
      {(provided, snapshot) => (
        <Card
          sx={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            minWidth: chartWidth + 36,
            overflowX: displayMode === "mini" ? "hidden" : undefined,
            width: displayMode === "mini" ? chartWidth + 36 : undefined,
            height: "fit-content",
          }}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <Box sx={{ display: "flex", alignItems: "stretch" }}>
            <Box
              sx={{
                display: "flex",
                flexGrow: 1,
                alignItems: "center",
              }}
              {...provided.dragHandleProps}
            >
              <Typography
                noWrap
                variant="h6"
                gutterBottom
                sx={{
                  m: 1,
                  fontSize: 16,
                  width: chartWidth - 52,
                }}
              >
                #{channel && channel.name}
              </Typography>
            </Box>
            {displayMode === "mini" && (
              <ButtonBase
                sx={{ width: 36 }}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </ButtonBase>
            )}
            {(displayMode === "full" || displayMode === "half") && (
              <ButtonBase sx={{ width: 36 }} onClick={handleToggleMaximized}>
                {displayMode === "full" ? (
                  <CloseFullscreen fontSize="small" />
                ) : (
                  <OpenInFull fontSize="small" />
                )}
              </ButtonBase>
            )}
          </Box>

          <Paper
            sx={{
              height: fullHeight,
              transition: "max-height 0.3s",
              overflow: "hidden",
              display: "flex",
            }}
            style={{
              maxHeight: expanded ? chartHeight : 0,
            }}
            elevation={0}
          >
            <CustomDrawer>
              <ToggleButtonGroup
                orientation="vertical"
                value={charts}
                onChange={handleChartChanged}
              >
                <ToggleButton
                  value="CompactChatView"
                  sx={{ border: 0, borderRadius: 0, justifyContent: "left" }}
                >
                  <Feed sx={{ mr: 1 }} />
                  Chat
                </ToggleButton>
                <ToggleButton
                  value="AnalysisBars"
                  sx={{ border: 0, borderRadius: 0, justifyContent: "left" }}
                >
                  <BarChart sx={{ mr: 1 }} />
                  Toxicity Analysis
                </ToggleButton>{" "}
                <ToggleButton
                  value="ActivityVolume"
                  sx={{ border: 0, borderRadius: 0, justifyContent: "left" }}
                >
                  <BarChart sx={{ mr: 1 }} />
                  Activity
                </ToggleButton>
              </ToggleButtonGroup>
            </CustomDrawer>
            <Box>
              {loaded && (
                <ChannelVizGroup
                  guildId={guildId}
                  channelId={channelId}
                  groupKey={groupKey}
                  initialLayoutKey={defaultDisplayMode}
                >
                  <CompactChatView
                    width={chartWidth}
                    hidden={!charts.includes("CompactChatView")}
                  />
                  <TransitionContainer
                    mounted={charts.includes("AnalysisBars")}
                    delay={500}
                  >
                    {(hidden) => (
                      <AnalysisBars
                        width={chartWidth}
                        hidden={hidden}
                        onDoubleClickBar={(e, [message]) =>
                          handleDoubleClickBar.current!(message)
                        }
                      />
                    )}
                  </TransitionContainer>
                  <TransitionContainer
                    mounted={charts.includes("ActivityVolume")}
                    delay={500}
                  >
                    {(hidden) => (
                      <ActivityVolume width={chartWidth} hidden={hidden} />
                    )}
                  </TransitionContainer>
                </ChannelVizGroup>
              )}
            </Box>
          </Paper>
        </Card>
      )}
    </Draggable>
  );
};

const CustomDrawer = ({ children }: React.PropsWithChildren<{}>) => {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    setOpen(!open);
  };

  return (
    <Box
      sx={{
        height: 1.0,
        display: "flex",
        backgroundColor: "rgba(0,0,0,0.1)",
        boxShadow: "inset -10px 0 5px -5px rgba(0,0,0,0.1)",
      }}
    >
      <ButtonBase
        onClick={handleClick}
        disableRipple
        sx={{
          height: 1.0,
          width: 36,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.1)",
        }}
      >
        <Add
          sx={{
            opacity: 0.6,
            transition: "transform 0.3s",
          }}
          style={{
            transform: `rotate(${open ? 45 : 0}deg) scale(${open ? 1.2 : 1})`,
          }}
        />
      </ButtonBase>
      <Box
        sx={{
          transition: "max-width 0.3s",
          overflowX: "hidden",
          display: "flex",
          flexFlow: "column",
        }}
        style={{
          maxWidth: open ? 120 : 0,
        }}
      >
        <Box
          sx={{
            width: 120,
            display: "flex",
            flexFlow: "column",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};
