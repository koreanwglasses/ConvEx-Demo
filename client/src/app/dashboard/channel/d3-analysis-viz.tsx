import { CircularProgress } from "@mui/material";
import { Box } from "@mui/system";
import { MessageData } from "../../../common/api-data-types";
import { useAppSelector } from "../../hooks";
import { VizScroller } from "../../viz-scroller/viz-scroller";
import { selectVizScrollerGroup } from "../../viz-scroller/viz-scroller-slice";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { selectBatchAnalysis } from "../../data/analyses-slice";
import { arrayEqual } from "../../../utils";
import { useInitialOffsets } from "./channel-viz-group/channel-viz-group-slice";
import { useGroupKey } from "./channel-viz-group/channel-viz-group";

type DrawArgs = {
  y: (message: MessageData) => number;
  data: (readonly [MessageData, number | undefined])[];
  width: number;
  height: number;
  renderHeight: number;
};
export const useD3VizComponent = <Selections extends Record<string, unknown>>(
  initialize: (svgRef: SVGSVGElement) => Selections,
  draw: (args: DrawArgs & Selections) => void
) =>
  useMemo(
    () =>
      (props: {
        messages?: MessageData[];
        filterMargin?: number;
      }) =>
        <D3Viz {...props} initialize={initialize} draw={draw} />,
    // No deps since these functions are intended to be unchanging even if they
    // are technically different instances
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

const D3Viz = <Selections extends Record<string, unknown>>({
  messages,
  initialize,
  draw,
  filterMargin = 0,
}: {
  messages?: MessageData[];
  initialize: (svgRef: SVGSVGElement) => Selections;
  draw: (args: DrawArgs & Selections) => void;
  filterMargin?: number;
}) => {
  const groupKey = useGroupKey();

  ////////////
  // LAYOUT //
  ////////////
  
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = containerRef.current?.clientWidth;
  const { height, offset } = useAppSelector(selectVizScrollerGroup(groupKey));

  const initialOffsets = useInitialOffsets(groupKey);

  //////////
  // DATA //
  //////////
  // Only rendering default messages and replies for now
  const messagesToRender = useMemo(
    () =>
      messages?.filter(
        (message) => message.type === "DEFAULT" || message.type === "REPLY"
      ),
    [messages]
  );
  const analyses = useAppSelector(
    selectBatchAnalysis(messagesToRender ?? []),
    arrayEqual
  );
  const data_ = useMemo(
    () =>
      messagesToRender?.map(
        (message, i) =>
          [message, analyses[i].analysis?.overallToxicity] as const
      ),
    [messagesToRender, analyses]
  );

  ///////////
  // CHART //
  ///////////
  // No deps since these functions are intended to be unchanging even if they
  // are technically different instances
  const initialize_ = useCallback(
    () => initialize(svgRef.current!),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const draw_ = useMemo(() => draw, []);

  const selections = useRef<Selections>();

  const prevOffset = useRef(0);
  useLayoutEffect(() => {
    const shift = offset - prevOffset.current;
    prevOffset.current = offset;
    svgRef.current?.style.setProperty("top", `${shift}px`);
  }, [offset]);

  useEffect(() => {
    if (!data_ || !width || !initialOffsets) return;
    if (!selections.current && !(selections.current = initialize_())) return;

    const y = (message: MessageData) =>
      height * 3 + initialOffsets(message)! + offset;

    const data = data_.filter(
      ([message]) =>
        initialOffsets(message) &&
        -filterMargin <= y(message) &&
        y(message) <= height * 3 + filterMargin
    );

    draw_({
      y,
      data,
      width,
      height,
      renderHeight: height * 3,
      ...selections.current,
    });

    svgRef.current?.style.setProperty("top", "0");
  }, [
    data_,
    draw_,
    filterMargin,
    height,
    initialize_,
    initialOffsets,
    offset,
    width,
  ]);

  return (
    <VizScroller
      groupKey={groupKey}
      sx={{ flexBasis: 300, flexGrow: 1, position: "relative" }}
      ref={containerRef}
    >
      <svg
        width={width}
        height={height * 3}
        ref={svgRef}
        style={{ position: "relative" }}
      />
      {!messages && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height,
            width,
            minWidth: 300,
            position: "absolute",
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </VizScroller>
  );
};
