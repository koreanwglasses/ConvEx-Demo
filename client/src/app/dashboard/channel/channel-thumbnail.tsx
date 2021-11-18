import { OpenInNew } from "@mui/icons-material";
import { ButtonBase, Card, Paper, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { useEffect } from "react";
import { shallowEqual } from "react-redux";
import { selectChannelById } from "../../data/channels-slice";
import { useAppDispatch, useAppSelector } from "../../hooks";
import {
  selectVizScrollerGroup,
  setClientHeight,
} from "../../viz-scroller/viz-scroller-slice";
import { ChannelVizGroup } from "./channel-viz-group/channel-viz-group";
import { Draggable } from "react-beautiful-dnd";
import { AnalysisSummary } from "./aggregates";

export const ChannelThumbnail = ({
  channelId,
  guildId,
  height = 200,
  width = 150,
  onPopOut,
  index,
}: {
  channelId: string;
  guildId: string;
  height?: number;
  width?: number;
  index: number;
  onPopOut?: (index: number) => void;
}) => {
  const groupKey = `${channelId}/stonks`;

  const dispatch = useAppDispatch();
  const channel = useAppSelector(selectChannelById(guildId, channelId));
  const { clientHeight } = useAppSelector(
    selectVizScrollerGroup(groupKey),
    shallowEqual
  );

  useEffect(() => {
    if (height !== clientHeight) {
      dispatch(setClientHeight({ key: groupKey, height }));
    }
  }, [clientHeight, dispatch, groupKey, height]);

  return (
    <Draggable draggableId={groupKey} index={index}>
      {(provided, snapshot) => (
        <Card
          sx={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            overflowX: "clip",
            width,
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
                  m: 0.5,
                  fontSize: 14,
                  width: width - 35,
                }}
              >
                #{channel && channel.name}
              </Typography>
            </Box>
            <ButtonBase sx={{ width: 36 }} onClick={() => onPopOut?.(index)}>
              <OpenInNew fontSize="small" />
            </ButtonBase>
          </Box>

          <Paper
            sx={{
              height,
              overflow: "clip",
              display: "flex",
            }}
            elevation={0}
          >
            <Box>
              <ChannelVizGroup
                guildId={guildId}
                channelId={channelId}
                groupKey={groupKey}
                initialLayoutMode={"time"}
              >
                <AnalysisSummary width={width} />
              </ChannelVizGroup>
            </Box>
          </Paper>
        </Card>
      )}
    </Draggable>
  );
};
