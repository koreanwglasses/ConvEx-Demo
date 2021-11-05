import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { IconButton, Paper, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React, { useState } from "react";
import { selectChannelById } from "../../data/channels-slice";
import { useAppSelector } from "../../hooks";
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

  const [showViz, setShowViz] = useState(false);

  return (
    <Paper
      sx={{
        width: 300,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h6" gutterBottom sx={{ m: 1, fontSize: 16 }}>
          #{channel && channel.name}
        </Typography>
        <Box>
          <IconButton onClick={() => setShowViz(!showViz)}>
            {showViz ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      <Paper
        sx={{
          height: 400,
          pl: 1,
          maxHeight: showViz ? 400 : 0,
          transition: "max-height 0.3s",
          overflowY: "hidden",
        }}
        elevation={0}
      >
        {showViz && (
          <ChannelVizGroup
            guildId={guildId}
            channelId={channelId}
            groupKey={channelId}
          >
            {({ reachedBeginning, messages }) => (
              <CompactChatView
                messages={messages}
                groupKey={channelId}
                guildId={guildId}
                channelId={channelId}
                reachedBeginning={reachedBeginning}
              />
            )}
          </ChannelVizGroup>
        )}
      </Paper>
    </Paper>
  );
};
