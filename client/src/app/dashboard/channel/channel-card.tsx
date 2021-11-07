import { Add, ExpandLess, ExpandMore } from "@mui/icons-material";
import {
  Card,
  CardActionArea,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import { Box } from "@mui/system";
import React, { useEffect, useState } from "react";
import { selectChannelById } from "../../data/channels-slice";
import { useAppSelector } from "../../hooks";
import { AnalysisBars } from "./analysis-bars";
import { ChannelVizGroup } from "./channel-viz-group";
import { CompactChatView } from "./compact-chat-view";

export const ChannelCard = ({
  channelId,
  guildId,
}: {
  channelId: string;
  guildId: string;
}) => {
  const channel = useAppSelector(selectChannelById(guildId, channelId));

  const [loaded, setLoaded] = useState(false);
  const [showViz, setShowViz] = useState(false);

  useEffect(() => {
    if (showViz && !loaded) setLoaded(true);
  }, [showViz, loaded]);

  return (
    <Card
      sx={{
        width: 600,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <CardActionArea
          sx={{
            display: "flex",
            justifyContent: "space-between",
            flexGrow: 1,
            alignItems: "center",
          }}
          onClick={() => {
            setShowViz(!showViz);
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ m: 1, fontSize: 16 }}>
            #{channel && channel.name}
          </Typography>
          {showViz ? <ExpandLess /> : <ExpandMore />}
        </CardActionArea>
        <Box>
          <IconButton size="small">
            <Add fontSize="inherit" />
          </IconButton>
        </Box>
      </Box>

      <Paper
        sx={{
          height: 400,
          pl: 1,
          transition: "max-height 0.3s",
          overflowY: "hidden",
        }}
        style={{
          maxHeight: showViz ? 400 : 0,
        }}
        elevation={0}
      >
        {loaded && (
          <ChannelVizGroup
            guildId={guildId}
            channelId={channelId}
            groupKey={channelId}
          >
            {({ reachedBeginning, messages }) => (
              <>
                <CompactChatView
                  messages={messages}
                  groupKey={channelId}
                  guildId={guildId}
                  channelId={channelId}
                  reachedBeginning={reachedBeginning}
                />
                <AnalysisBars messages={messages} groupKey={channelId} />
              </>
            )}
          </ChannelVizGroup>
        )}
      </Paper>
    </Card>
  );
};
