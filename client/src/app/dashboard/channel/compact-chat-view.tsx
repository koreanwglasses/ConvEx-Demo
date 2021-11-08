import { Avatar, Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useMemo, useRef } from "react";
import { MessageData } from "../../../common/api-data-types";
import { selectAnalysis } from "../../data/analyses-slice";
import { fetchMember, selectMember } from "../../data/members-slice";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { VizScroller } from "../../viz-scroller/viz-scroller";
import { useVizScrollerGroup } from "../../viz-scroller/viz-scroller-slice";
import * as d3 from "d3";
import {
  useInitialOffsets,
  setInitialOffset,
  useMessages,
  useChannelVizGroup,
  selectLayout,
  clearInitialOffsets,
} from "./channel-viz-group/channel-viz-group-slice";
import { useGroupKey } from "./channel-viz-group/channel-viz-group";

export const CompactChatView = ({
  hidden = false,
  width = 300,
}: {
  hidden?: boolean;
  width?: number;
}) => {
  const groupKey = useGroupKey();
  const { clientHeight, canvasHeight, offset } = useVizScrollerGroup(groupKey);
  const { reachedBeginning } = useChannelVizGroup(groupKey);
  const initialOffsets = useInitialOffsets(groupKey);
  const messages = useMessages(groupKey);
  const dispatch = useAppDispatch();

  // Only rendering default messages and replies for now
  const messagesToRender = useMemo(
    () =>
      messages?.filter(
        (message) =>
          (message.type === "DEFAULT" || message.type === "REPLY") &&
          -(initialOffsets?.(message) ?? 0) <
            Math.ceil(1.5 + offset / canvasHeight) * canvasHeight
      ),
    [canvasHeight, initialOffsets, messages, offset]
  );
  const first = messagesToRender?.length && messagesToRender[0];
  const last =
    messagesToRender?.length && messagesToRender[messagesToRender.length - 1];

  const messageGroups = useMemo(() => {
    const groupingThreshold = 1000 * 60 * 5;

    const messageGroups = messagesToRender?.reduce((groups, message) => {
      if (groups.length === 0) {
        groups.push([message]);
        return groups;
      }

      const lastGroup = groups[groups.length - 1];
      const lastMessage = lastGroup[lastGroup.length - 1];

      if (
        lastMessage.authorId === message.authorId &&
        lastMessage.createdTimestamp - message.createdTimestamp <
          groupingThreshold
      ) {
        lastGroup.push(message);
        return groups;
      }

      groups.push([message]);
      return groups;
    }, [] as MessageData[][]);

    return messageGroups;
    // Only update if contents of array have changed. Just check first and last elem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, last]);

  const lastWidth = useRef(width);
  const lastDifferentWidth = useRef(width);
  useEffect(() => {
    if (lastWidth.current !== width) {
      lastDifferentWidth.current = lastWidth.current;
      setTimeout(() => dispatch(clearInitialOffsets({ groupKey })), 300);
    }
    lastWidth.current = width;
  }, [dispatch, groupKey, width]);

  return (
    <VizScroller
      groupKey={groupKey}
      sx={{ transition: "max-width 0.3s", overflowX: "hidden" }}
      style={{
        maxWidth: hidden ? 0 : width,
        width: Math.max(lastDifferentWidth.current, width),
      }}
      fixedBaseline
    >
      <Box
        sx={{
          width,

          display: "flex",
          flexFlow: "column-reverse",
          gap: 1,
          pb: 1,
          pl: 1,
        }}
      >
        {messageGroups?.map((group) => (
          <CompactMessageGroup
            messages={group}
            groupKey={groupKey}
            key={group[0].id}
          />
        ))}

        {!reachedBeginning && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              mb: 1,
            }}
            style={{
              height: messages ? undefined : clientHeight,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        {reachedBeginning && (
          <div>
            <em style={{ opacity: 0.6, fontSize: 10 }}>
              Reached beginning of channel
            </em>
          </div>
        )}
      </Box>
    </VizScroller>
  );
};

const CompactMessageGroup = ({
  messages,
  groupKey,
}: {
  messages: MessageData[];
  groupKey: string;
}) => {
  const { guildId } = useChannelVizGroup(groupKey);

  const memberId = messages[0].authorId;
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
          {messages.map((message) => (
            <CompactMessageView
              message={message}
              groupKey={groupKey}
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
}: {
  message: MessageData;
  groupKey: string;
}) => {
  const { guildId, channelId } = useChannelVizGroup(groupKey);
  const { offsetMap } = useAppSelector(selectLayout(groupKey));

  const ref = useRef<HTMLDivElement>(null);

  const dispatch = useAppDispatch();
  useEffect(() => {
    if (ref.current && !(message.id in offsetMap)) {
      dispatch(
        setInitialOffset({
          groupKey,
          itemKey: message.id,
          offset:
            ref.current.offsetTop +
            ref.current.offsetHeight / 2 -
            (ref.current.offsetParent?.clientHeight ?? 0),
        })
      );
    }
  }, [dispatch, message, groupKey, offsetMap]);

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
        fontSize: 14,
        pl: 0.5,
        pr: 1,
      }}
      style={{
        backgroundColor: toxicityColor.toString(),
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
