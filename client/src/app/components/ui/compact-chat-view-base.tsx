import { Box, Avatar, Typography } from "@mui/material";
import * as d3 from "d3";
import React from "react";
import {
  AnalysisData,
  MemberData,
  MessageData,
} from "../../../common/api-data-types";

export const CompactMessageGroupBase = ({
  messages,
  member,
  analyses,
  threshold,
  MessageComponent = CompactMessageViewBase,
}: {
  messages: MessageData[];
  member?: MemberData;
  analyses: {
    pending: boolean;
    analysis?: AnalysisData | null;
    valid: boolean;
  }[];
  threshold: number;
  MessageComponent?: (props: {
    message: MessageData;
    threshold: number;
    analysis?: AnalysisData | null;
  }) => React.ReactElement | null;
}) => {
  // check toxicity of messages to see if avatar and icon should fade
  const shouldFade = !analyses.find(({ analysis }) => {
    const tox = analysis?.overallToxicity;
    if (typeof tox !== "number") return true;
    if (tox >= threshold) return true;
    return false;
  });
  const opacity = shouldFade ? 0.4 : 1;

  return (
    <Box sx={{ display: "flex" }}>
      <Avatar
        src={member?.displayAvatarURL}
        alt={member?.user.username}
        sx={{ width: 24, height: 24, mr: 1, mt: 0.5 }}
        style={{ opacity }}
      />
      <Box sx={{ display: "flex", flexFlow: "column", flexGrow: 1 }}>
        <Box sx={{ display: "flex", mb: 0.25 }} style={{ opacity }}>
          <Typography
            variant="subtitle2"
            sx={{ mr: 1, color: "#ffffff" }}
            style={{
              color:
                member?.displayHexColor !== "#000000"
                  ? member?.displayHexColor
                  : undefined,
            }}
          >
            {member?.user.username ?? "..."}
          </Typography>
          <Typography
            variant="caption"
            sx={{ position: "relative", top: 1, opacity: 0.8 }}
          >
            {new Date(messages[0].createdTimestamp).toLocaleString()}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexFlow: "column-reverse",
          }}
        >
          {messages.map((message, i) => (
            <MessageComponent
              message={message}
              threshold={threshold}
              analysis={analyses[i].analysis}
              key={message.id}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export const CompactMessageViewBase = React.forwardRef(
  (
    {
      message,
      threshold,
      analysis,
    }: {
      message: MessageData;
      analysis?: AnalysisData | null;
      threshold: number;
    },
    ref
  ) => {
    const { overallToxicity } = analysis ?? {};

    const toxicityColor = d3.color(d3.interpolateYlOrRd(overallToxicity ?? 0))!;
    toxicityColor.opacity = overallToxicity ?? 0;

    const hasEmbed = message.embeds.length;
    const hasAttachment = Object.values(message.attachments).length;

    return (
      <Box
        sx={{
          wordBreak: "break-word",
          fontSize: 14,
          pl: 0.5,
          pr: 1,
        }}
        style={{
          backgroundColor: toxicityColor.toString(),
          opacity:
            typeof overallToxicity === "number" && overallToxicity < threshold
              ? 0.4
              : 1,
        }}
        ref={ref}
      >
        {hasEmbed || hasAttachment ? (
          <>
            <em style={{ opacity: 0.6, fontSize: 10 }}>
              This message contains {hasEmbed ? "embeds" : ""}
              {hasEmbed && hasAttachment ? " and " : ""}
              {hasAttachment ? "attachments" : ""}
            </em>
            <br />
          </>
        ) : null}
        {message.content}
      </Box>
    );
  }
);
