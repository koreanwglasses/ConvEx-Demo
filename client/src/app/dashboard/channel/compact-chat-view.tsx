import { Avatar, Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useMemo, useRef } from "react";
import { MessageData } from "../../../common/api-data-types";
import { selectAnalysis, selectBatchAnalysis } from "../../data/analyses-slice";
import { fetchMember, selectMember } from "../../data/members-slice";
import { useAppDispatch, useAppSelector, usePreviousValue } from "../../hooks";
import { VizScroller } from "../../viz-scroller/viz-scroller";
import { useVizScrollerGroup } from "../../viz-scroller/viz-scroller-slice";
import * as d3 from "d3";
import {
  setInitialOffset,
  useMessages,
  useChannelVizGroup,
  selectLayout,
  selectThreshold,
  setLayoutKey,
} from "./channel-viz-group/channel-viz-group-slice";
import { useGroupKey } from "./channel-viz-group/channel-viz-group";
import { shallowEqual } from "react-redux";
import { arrayEqual } from "../../../utils";

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
  const messages = useMessages(groupKey);
  const dispatch = useAppDispatch();
  const { offsetMap, offsetBottomMap, offsetTopMap } = useAppSelector(
    selectLayout(groupKey)
  );

  // Only rendering default messages and replies for now
  const messagesToRender = useMemo(() => {
    const messagesToRender = messages?.filter(
      (message) => message.type === "DEFAULT" || message.type === "REPLY"
    );

    return messagesToRender?.filter((message, i, messages) => {
      const next = i + 1 < messages.length && messages[i + 1];
      return (
        (next && !(next.id in offsetMap)) ||
        !(message.id in offsetMap) ||
        (!hidden &&
          offsetTopMap[message.id] - 40 < -offset &&
          (offsetBottomMap[message.id] ?? 0) >= -(offset + canvasHeight))
      );
    });
  }, [
    canvasHeight,
    messages,
    offset,
    offsetBottomMap,
    offsetMap,
    offsetTopMap,
    hidden,
  ]);
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

  const prevWidth = usePreviousValue(width, () =>
    dispatch(
      setLayoutKey({ groupKey, layoutKey: width === 500 ? "large" : "default" })
    )
  );

  const baseline =
    (messagesToRender?.[0] && offsetBottomMap[messagesToRender[0].id]) ?? 0;

  return (
    <VizScroller
      groupKey={groupKey}
      sx={{ transition: "max-width 0.3s", overflowX: "hidden" }}
      style={{
        maxWidth: hidden ? 0 : width,
        width: Math.max(width, prevWidth ?? 0),
      }}
      fixedBaseline
    >
      <Box
        sx={{
          width,

          display: "flex",
          flexFlow: "column-reverse",
          gap: 1,
          pl: 1,
        }}
      >
        <div style={{ height: -baseline - 8 }} />
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

  // check toxicity of messages to see if avatar and icon should fade
  const analyses = useAppSelector(selectBatchAnalysis(messages), arrayEqual);
  const threshold = useAppSelector(selectThreshold(groupKey));
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
  const threshold = useAppSelector(selectThreshold(groupKey));
  const { offsetMap } = useAppSelector(selectLayout(groupKey), shallowEqual);

  const ref = useRef<HTMLDivElement>(null);

  const dispatch = useAppDispatch();
  useEffect(() => {
    // if (ref.current && message.id in offsetMap) {
    //   const ex =
    //     offsetBottomMap[message.id]
    //     const ac =
    //     ref.current.offsetTop +
    //       ref.current.clientHeight -
    //       (ref.current.offsetParent?.clientHeight ?? 0)
    //       if(Math.abs(ex-ac) > 1)
    //   console.log("Discrepancy:", ex, ac, ex-ac, message);
    // }
    if (ref.current && !(message.id in offsetMap)) {
      dispatch(
        setInitialOffset({
          groupKey,
          itemKey: message.id,
          offset:
            ref.current.offsetTop +
            ref.current.offsetHeight / 2 -
            (ref.current.offsetParent?.clientHeight ?? 0),
          offsetTop:
            ref.current.offsetTop -
            (ref.current.offsetParent?.clientHeight ?? 0),
          offsetBottom:
            ref.current.offsetTop +
            ref.current.clientHeight -
            (ref.current.offsetParent?.clientHeight ?? 0),
        })
      );
    }
  }, [dispatch, groupKey, message.id, offsetMap]);

  const { analysis } = useAppSelector(
    selectAnalysis(guildId, channelId, message.id)
  );
  const { overallToxicity } = analysis ?? {};

  const toxicityColor = d3.color(d3.interpolateYlOrRd(overallToxicity ?? 0))!;
  toxicityColor.opacity = overallToxicity ?? 0;

  const hasEmbed = message.embeds.length;
  const hasAttachment = Object.values(message.attachments).length;

  return (
    <>
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
      {/* <Box
        sx={{
          width: 100,
          height: "1px",
          backgroundColor: "red",
          position: "absolute",
        }}
        style={{ bottom: -offsetBottomMap[message.id] }}
      /> */}
    </>
  );
};
