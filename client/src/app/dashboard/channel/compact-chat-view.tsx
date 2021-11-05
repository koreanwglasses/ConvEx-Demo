import { Avatar, Box, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { MessageData } from "../../../common/api-data-types";
import { selectAnalysis } from "../../data/analyses-slice";
import { fetchMember, selectMember } from "../../data/members-slice";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { VizScroller } from "../../viz-scroller/viz-scroller";
import {
  selectInitialOffsets,
  setInitialOffset,
} from "../../viz-scroller/viz-scroller-slice";
import * as d3 from "d3";

export const CompactChatView = ({
  guildId,
  channelId,
  messages,
  groupKey,
}: {
  messages: MessageData[];
  guildId: string;
  channelId: string;
  groupKey: string;
}) => {
  // Only rendering default messages and replies for now
  const messagesToRender = messages.filter(
    (message) => message.type === "DEFAULT" || message.type === "REPLY"
  );

  const groupingThreshold = 1000 * 60 * 5;
  const messageGroups = messagesToRender.reduce((groups, message) => {
    if (groups.length === 0) {
      groups.push([message]);
      return groups;
    }

    const lastGroup = groups[groups.length - 1];
    const lastMessage = lastGroup[lastGroup.length - 1];

    if (
      lastMessage.authorID === message.authorID &&
      lastMessage.createdTimestamp - message.createdTimestamp <
        groupingThreshold
    ) {
      lastGroup.push(message);
      return groups;
    }

    groups.push([message]);
    return groups;
  }, [] as MessageData[][]);

  return (
    <VizScroller groupKey={groupKey} fixedBaseline>
      <Box
        sx={{
          display: "flex",
          flexFlow: "column-reverse",
          gap: 1,
        }}
      >
        {messageGroups.map((group) => (
          <CompactMessageGroup
            messages={group}
            groupKey={groupKey}
            channelId={channelId}
            guildId={guildId}
            key={group[0].id}
          />
        ))}
      </Box>
    </VizScroller>
  );
};
const CompactMessageGroup = ({
  messages,
  guildId,
  channelId,
  groupKey,
}: {
  messages: MessageData[];
  groupKey: string;
  guildId: string;
  channelId: string;
}) => {
  const memberId = messages[0].authorID;
  const {
    member,
    valid: isValid,
    pending,
  } = useAppSelector(selectMember(guildId, memberId));

  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!isValid && !pending) {
      dispatch(fetchMember(guildId, memberId));
    }
  }, [isValid, pending, dispatch, memberId, guildId]);

  return (
    <Box sx={{ display: "flex" }}>
      <Avatar
        src={member?.displayAvatarURL}
        alt={member?.user.username}
        sx={{ width: 24, height: 24, mr: 1, mt: 0.5 }}
      />
      <Box sx={{ display: "flex", flexFlow: "column", flexGrow: 1 }}>
        <Box sx={{ display: "flex", mb: 0.25 }}>
          <Typography
            variant="subtitle2"
            sx={{ mr: 1, color: member?.displayHexColor }}
          >
            {member?.user.username}
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
          {messages.map((message) => (
            <CompactMessageView
              message={message}
              groupKey={groupKey}
              guildId={guildId}
              channelId={channelId}
              key={message.id}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};
const CompactMessageView = ({
  message,
  groupKey,
  channelId,
  guildId,
}: {
  message: MessageData;
  groupKey: string;
  channelId: string;
  guildId: string;
}) => {
  const initialOffsets = useAppSelector(selectInitialOffsets(groupKey));

  const ref = useRef<HTMLDivElement>(null);

  const dispatch = useAppDispatch();
  useEffect(() => {
    if (ref.current && !initialOffsets?.(message.id)) {
      dispatch(
        setInitialOffset({
          key: groupKey,
          itemKey: message.id,
          offset: ref.current.clientTop - ref.current.clientHeight / 2,
        })
      );
    }
  }, [dispatch, message, groupKey, initialOffsets]);

  const { analysis } = useAppSelector(
    selectAnalysis(guildId, channelId, message.id)
  );
  const { overallToxicity = 0 } = analysis ?? {};

  const toxicityColor = d3.color(d3.interpolateYlOrRd(overallToxicity))!;
  toxicityColor.opacity = overallToxicity;

  const hasEmbed = message.embeds.length;
  const hasAttachment = Object.values(message.attachments).length;

  return (
    <Box
      sx={{
        wordBreak: "break-word",
        backgroundColor: toxicityColor.toString(),
        fontSize: 14,
        pl: 0.5,
        pr:1
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
};
