import { Box, CircularProgress } from "@mui/material";
import { useEffect, useMemo, useRef } from "react";
import { AnalysisData, MessageData } from "../../../common/api-data-types";
import { selectBatchAnalysis } from "../../data/analyses-slice";
import { fetchMember, selectMember } from "../../data/members-slice";
import { useAppDispatch, useAppSelector, usePreviousValue } from "../../hooks";
import { VizScroller } from "../../viz-scroller/viz-scroller";
import { useVizScrollerGroup } from "../../viz-scroller/viz-scroller-slice";
import {
  setOffsets,
  useMessages,
  useChannelVizGroup,
  selectLayoutData,
  selectThreshold,
} from "./channel-viz-group/channel-viz-group-slice";
import { useGroupKey } from "./channel-viz-group/channel-viz-group";
import { shallowEqual } from "react-redux";
import { arrayEqual } from "../../../utils";
import {
  CompactMessageGroupBase,
  CompactMessageViewBase,
} from "../../components/ui/compact-chat-view-base";

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
  const { offsetMap, offsetBottomMap, offsetTopMap } = useAppSelector(
    selectLayoutData(groupKey),
    shallowEqual
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

  const prevWidth = usePreviousValue(width);

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

  return (
    <CompactMessageGroupBase
      messages={messages}
      analyses={analyses}
      threshold={threshold}
      member={member}
      MessageComponent={(props) => (
        <CompactMessageView {...props} groupKey={groupKey} />
      )}
    />
  );
};

const CompactMessageView = ({
  message,
  analysis,
  threshold,
  groupKey,
}: {
  message: MessageData;
  groupKey: string;
  analysis?: AnalysisData | null;
  threshold: number;
}) => {
  const { offsetMap } = useAppSelector(
    selectLayoutData(groupKey),
    shallowEqual
  );

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
        setOffsets({
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

  return (
    <>
      <CompactMessageViewBase
        message={message}
        analysis={analysis}
        threshold={threshold}
        ref={ref}
      />
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
