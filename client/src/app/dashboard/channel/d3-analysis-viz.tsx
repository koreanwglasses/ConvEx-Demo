import { MessageData } from "../../../common/api-data-types";
import { useAppSelector, usePreviousValue } from "../../hooks";
import { VizScroller } from "../../viz-scroller/viz-scroller";
import { useVizScrollerGroup } from "../../viz-scroller/viz-scroller-slice";
import React, {
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
  useOffsets,
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
    () => (props: Omit<Props<Selections>, "initialize" | "draw">) =>
      <D3Viz {...props} initialize={initialize} draw={draw} />,
    // No deps since these functions are intended to be unchanging even if they
    // are technically different instances
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

type Props<Selections> = React.PropsWithChildren<{
  initialize: (svgRef: SVGSVGElement) => Selections;
  draw: (args: DrawArgs & Selections) => void;
  filterMargin?: number;
  hidden?: boolean;
  width?: number;
}>;

const D3Viz = <Selections extends Record<string, unknown>>({
  initialize,
  draw,
  hidden = false,
  width = 300,
  filterMargin = 0,
  children,
}: Props<Selections>) => {
  const groupKey = useGroupKey();
  const messages = useMessages(groupKey);

  ////////////
  // LAYOUT //
  ////////////

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { canvasHeight, clientHeight, offset } = useVizScrollerGroup(groupKey);

  const { isTransitioning, prevMode, transitionOffset, layoutKey } =
    useAppSelector(selectLayoutMode(groupKey), shallowEqual);

  const initialOffsets = useOffsets(groupKey);
  const prevInitialOffsets = useOffsets(groupKey, prevMode);

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
    if (!data_ || !initialOffsets) return;
    if (!selections.current) {
      selections.current = initialize_();
    }

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
    layoutKey,
  ]);

  const prevWidth = usePreviousValue(width);

  return (
    <VizScroller
      groupKey={groupKey}
      sx={{ position: "relative", transition: "max-width 0.3s" }}
      style={{
        maxWidth: hidden ? 0 : width,
        width: Math.max(width, prevWidth ?? 0),
      }}
      ref={containerRef}
    >
      <svg
        width={width}
        height={canvasHeight}
        ref={svgRef}
        style={{ position: "relative" }}
      />
      {children}
    </VizScroller>
  );
};
