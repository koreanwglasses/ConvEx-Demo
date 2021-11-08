import { CircularProgress } from "@mui/material";
import { Box } from "@mui/system";
import { MessageData } from "../../../common/api-data-types";
import { useAppSelector } from "../../hooks";
import { VizScroller } from "../../viz-scroller/viz-scroller";
import { useVizScrollerGroup } from "../../viz-scroller/viz-scroller-slice";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { selectBatchAnalysis } from "../../data/analyses-slice";
import { arrayEqual } from "../../../utils";
import {
  selectLayoutMode,
  useInitialOffsets,
  useMessages,
} from "./channel-viz-group/channel-viz-group-slice";
import { useGroupKey } from "./channel-viz-group/channel-viz-group";
import { shallowEqual } from "react-redux";

type DrawArgs = {
  data: (readonly [MessageData, number | undefined])[];
  applyY: (
    offsetY: (datum: readonly [MessageData, number | undefined]) => number
  ) => (
    sel: d3.Selection<
      any,
      readonly [MessageData, number | undefined],
      any,
      unknown
    >
  ) => void;
  y: (message: MessageData) => number;
  yPrev?: (message: MessageData) => number;
  isTransitioning: boolean;
  transitionOffset: number;
  width: number;
  clientHeight: number;
  canvasHeight: number;
};
export const useD3VizComponent = <Selections extends Record<string, unknown>>(
  initialize: (svgRef: SVGSVGElement) => Selections,
  draw: (args: DrawArgs & Selections) => void
) =>
  useMemo(
    () =>
      (props: { filterMargin?: number; hidden?: boolean; width?: number }) =>
        <D3Viz {...props} initialize={initialize} draw={draw} />,
    // No deps since these functions are intended to be unchanging even if they
    // are technically different instances
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

const D3Viz = <Selections extends Record<string, unknown>>({
  initialize,
  draw,
  hidden = false,
  width: width_ = 300,
  filterMargin = 0,
}: {
  initialize: (svgRef: SVGSVGElement) => Selections;
  draw: (args: DrawArgs & Selections) => void;
  filterMargin?: number;
  hidden?: boolean;
  width?: number;
}) => {
  const groupKey = useGroupKey();
  const messages = useMessages(groupKey);

  ////////////
  // LAYOUT //
  ////////////

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = containerRef.current?.clientWidth;
  const { canvasHeight, clientHeight, offset } = useVizScrollerGroup(groupKey);

  const { isTransitioning, prevMode, transitionOffset } = useAppSelector(
    selectLayoutMode(groupKey),
    shallowEqual
  );

  const initialOffsets = useInitialOffsets(groupKey);
  const prevInitialOffsets = useInitialOffsets(groupKey, prevMode);

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

    const yFromInitialOffsets =
      (initialOffsets?: (message: MessageData) => number | undefined) =>
      (message: MessageData) => {
        const io = initialOffsets?.(message);
        if (typeof io !== "number") return;
        return canvasHeight + io + offset;
      };

    const y = yFromInitialOffsets(initialOffsets);
    const yPrev = yFromInitialOffsets(prevInitialOffsets);

    const isWithinMargin = (y?: number) =>
      typeof y === "number" &&
      -filterMargin <= y &&
      y <= canvasHeight + filterMargin;

    const data = data_.filter(
      ([message]) =>
        isWithinMargin(y(message)) ||
        (isTransitioning && isWithinMargin(yPrev(message)))
    );

    const applyY =
      (
        offsetY: (datum: readonly [MessageData, number | undefined]) => number
      ) =>
      (
        sel: d3.Selection<
          any,
          readonly [MessageData, number | undefined],
          any,
          unknown
        >
      ) => {
        if (isTransitioning) {
          sel
            .attr(
              "y",
              (datum) => yPrev!(datum[0])! + offsetY(datum) + transitionOffset
            )
            .transition()
            .delay(250)
            .duration(400)
            .attr("y", (datum) => y!(datum[0])! + offsetY(datum));
        } else {
          sel.attr("y", (datum) => y!(datum[0])! + offsetY(datum));
        }
      };

    draw_({
      data: data.filter(
        ([message]) =>
          typeof y(message) === "number" &&
          (!isTransitioning || typeof yPrev(message) === "number")
      ),
      applyY,
      y: y as (message: MessageData) => number,
      yPrev: yPrev as (message: MessageData) => number,
      isTransitioning,
      transitionOffset,
      width,
      clientHeight,
      canvasHeight,
      ...selections.current,
    });

    svgRef.current?.style.setProperty("top", "0");
  }, [
    canvasHeight,
    clientHeight,
    data_,
    draw_,
    filterMargin,
    initialOffsets,
    initialize_,
    isTransitioning,
    offset,
    prevInitialOffsets,
    transitionOffset,
    width,
  ]);

  return (
    <VizScroller
      groupKey={groupKey}
      sx={{ position: "relative", transition: "max-width 0.3s" }}
      style={{ maxWidth: hidden ? 0 : width_, width: width_ }}
      ref={containerRef}
    >
      <svg
        width={width}
        height={canvasHeight}
        ref={svgRef}
        style={{ position: "relative" }}
      />
      {!messages && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width,
            minWidth: 300,
            position: "absolute",
          }}
          style={{
            height: clientHeight,
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </VizScroller>
  );
};
