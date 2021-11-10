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
  CardActionArea,
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

export const ChannelCard = ({
  channelId,
  guildId,
  smallHeight,
  largeHeight,
  variant = "full",
}: {
  channelId: string;
  guildId: string;
  smallHeight: number;
  largeHeight: number;
  variant?: "palette" | "full";
}) => {
  const groupKey = channelId;

  const dispatch = useAppDispatch();
  const channel = useAppSelector(selectChannelById(guildId, channelId));
  const { clientHeight } = useAppSelector(
    selectVizScrollerGroup(groupKey),
    shallowEqual
  );
  const { mode } = useAppSelector(selectLayoutMode(groupKey), shallowEqual);

  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (expanded && !loaded) setLoaded(true);
  }, [expanded, loaded]);

  const [maximized, setMaximized] = useState(false);
  const chartWidth = maximized ? 400 : 300;
  const chartHeight = maximized ? largeHeight : smallHeight;
  useEffect(() => {
    if (chartHeight !== clientHeight) {
      dispatch(setClientHeight({ key: groupKey, height: chartHeight }));
    }
  }, [chartHeight, clientHeight, dispatch, groupKey]);

  const handleToggleMaximized = () => {
    const newMaximized = !maximized;
    setMaximized(newMaximized);
    if (newMaximized && !expanded) setExpanded(true);

    dispatch(
      transitionLayouts({
        groupKey,
        layoutKey: newMaximized ? "large" : "default",
        smooth: false,
      })
    );
  };

  type ChartType = "CompactChatView" | "AnalysisBars";
  const [charts, setCharts] = useState<ChartType[]>(["CompactChatView"]);

  const handleChartChanged = (
    e: unknown,
    value: ChartType[],
    pivot?: MessageData
  ) => {
    const newCharts = variant === "full" ? value : value.slice(-1);

    const wasChatOpen = charts.includes("CompactChatView");
    const isChatOpen = newCharts.includes("CompactChatView");
    setCharts(newCharts);

    if (wasChatOpen && !isChatOpen && mode !== "compact")
      dispatch(transitionLayouts({ groupKey, mode: "compact", pivot }));
    if (!wasChatOpen && isChatOpen && mode !== "map")
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
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        minWidth: 336,
        overflowX: variant === "palette" ? "hidden" : undefined,
      }}
      style={{
        width: !expanded || variant === "palette" ? 336 : undefined,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "stretch" }}>
        <CardActionArea
          sx={{
            display: "flex",
            justifyContent: "space-between",
            flexGrow: 1,
            alignItems: "center",
            pr: 0.5,
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Typography
            noWrap
            variant="h6"
            gutterBottom
            sx={{ m: 1, fontSize: 16, width: maximized ? 350 : 250 }}
          >
            #{channel && channel.name}
          </Typography>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </CardActionArea>
        {variant === "full" && (
          <Box>
            <ButtonBase
              sx={{ width: 36, height: 1.0 }}
              onClick={handleToggleMaximized}
            >
              {maximized ? (
                <CloseFullscreen fontSize="small" />
              ) : (
                <OpenInFull fontSize="small" />
              )}
            </ButtonBase>
          </Box>
        )}
      </Box>

      <Paper
        sx={{
          height: largeHeight,
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
            </ToggleButton>
          </ToggleButtonGroup>
        </CustomDrawer>
        <Box>
          {loaded && (
            <ChannelVizGroup
              guildId={guildId}
              channelId={channelId}
              groupKey={groupKey}
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
            </ChannelVizGroup>
          )}
        </Box>
      </Paper>
    </Card>
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
