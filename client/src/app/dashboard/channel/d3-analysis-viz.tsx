import { MessageData } from "../../../common/api-data-types";
import { useAppSelector, useArray, usePreviousValue } from "../../hooks";
import { VizScroller } from "../../viz-scroller/viz-scroller";
import {
  selectVizScrollerGroup,
  useVizScrollerGroup,
} from "../../viz-scroller/viz-scroller-slice";
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
  useMessages,
  selectLayoutData,
  selectOffsets,
} from "./channel-viz-group/channel-viz-group-slice";
import { useGroupKey } from "./channel-viz-group/channel-viz-group";
import * as d3 from "d3";
import { store } from "../../store";

type Datum = readonly [MessageData, number | undefined];

type DrawArgs = {
  data: Datum[];
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
  dataFilter?: (datum: Datum) => boolean;
  hidden?: boolean;
  width?: number;
  dependencies?: unknown[];
}>;

const D3Viz = <Selections extends Record<string, unknown>>({
  initialize: initialize_,
  draw: draw_,
  hidden = false,
  dataFilter: dataFilter_,
  width = 300,
  children,
  dependencies = [],
}: Props<Selections>) => {
  const groupKey = useGroupKey();
  const messages = useMessages(groupKey);
  const dataFilter = dataFilter_ ?? getDefaultDataFilter(groupKey);

  ////////////
  // LAYOUT //
  ////////////

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { canvasHeight, clientHeight, offset } = useVizScrollerGroup(groupKey);

  // const { isTransitioning, prevMode, transitionOffset, layoutKey } =
  //   useAppSelector(selectLayoutMode(groupKey), shallowEqual);

  // const offsets = useOffsets(groupKey);
  // const prevOffsets = useOffsets(groupKey, prevMode);

  //////////
  // DATA //
  //////////

  // Only rendering default messages and replies for now
  const messagesToRender = messages?.filter(
    (message) => message.type === "DEFAULT" || message.type === "REPLY"
  );

  const analyses = useAppSelector(
    selectBatchAnalysis(messagesToRender ?? []),
    arrayEqual
  );

  const data = useArray(
    messagesToRender
      ?.map(
        (message, i) =>
          [message, analyses[i].analysis?.overallToxicity] as const
      )
      .filter(dataFilter)
  );

  ///////////
  // CHART //
  ///////////

  // No deps since these functions are intended to be unchanging even if they
  // are technically different instances
  const initialize = useCallback(
    () => initialize_(svgRef.current!),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const draw = useMemo(() => draw_, []);

  const selections = useRef<Selections>();

  const prevOffset = useRef(0);
  useLayoutEffect(() => {
    const shift = offset - prevOffset.current;
    prevOffset.current = offset;
    svgRef.current?.style.setProperty("top", `${shift}px`);
  }, [offset]);

  useEffect(() => {
    if (!data) return;
    if (!selections.current) {
      selections.current = initialize();
    }

    draw({
      data,
      width,
      clientHeight,
      canvasHeight,
      ...selections.current,
    });

    svgRef.current?.style.setProperty("top", "0");
  }, [
    canvasHeight,
    clientHeight,
    width,
    offset,
    data,
    draw,
    initialize,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...dependencies,
  ]);

  const prevWidth = usePreviousValue(width);

  return (
    <VizScroller
      groupKey={groupKey}
      sx={{
        position: "relative",
        transition: "max-width 0.3s",
        overflowX: "clip",
      }}
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

export const getY = (groupKey: string) => {
  const offsets = selectOffsets(groupKey)(store.getState());
  const { offset, canvasHeight } = selectVizScrollerGroup(groupKey)(
    store.getState()
  );
  return (datum: Datum) => offsets(datum[0]) + offset + canvasHeight;
};

export const getYPrev = (groupKey: string) => {
  const { prevMode } = selectLayoutMode(groupKey)(store.getState());
  const offsets = selectOffsets(groupKey, prevMode)(store.getState());
  const { offset, canvasHeight } = selectVizScrollerGroup(groupKey)(
    store.getState()
  );
  return (datum: Datum) => offsets(datum[0]) + offset + canvasHeight;
};

export const getDefaultDataFilter = (groupKey: string, margin = 50) => {
  const { isTransitioning } = selectLayoutMode(groupKey)(store.getState());
  const { canvasHeight } = selectVizScrollerGroup(groupKey)(store.getState());
  const y = getY(groupKey);
  const yPrev = getYPrev(groupKey);

  const isWithinMargin = (y?: number) =>
    typeof y === "number" && -margin <= y && y <= canvasHeight + margin;

  return (datum: Datum) =>
    isWithinMargin(y(datum)) ||
    (isTransitioning && isWithinMargin(yPrev(datum)));
};

export const applyY =
  (
    groupKey: string,
    offsetY: number | ((datum: Datum) => number),
    attr = "y"
  ) =>
  (
    sel: d3.Selection<
      any,
      readonly [MessageData, number | undefined],
      any,
      unknown
    >
  ) => {
    const { isTransitioning, transitionOffset } = selectLayoutMode(groupKey)(
      store.getState()
    );
    const y = getY(groupKey);
    const yPrev = getYPrev(groupKey);

    const offset = (datum: Datum) =>
      typeof offsetY === "number" ? offsetY : offsetY(datum);

    if (isTransitioning) {
      sel
        .attr(attr, (datum) => yPrev(datum) + offset(datum) + transitionOffset)
        .transition()
        .delay(250)
        .duration(400)
        .attr(attr, (datum) => y(datum) + offset(datum));
    } else {
      sel.attr(attr, (datum) => y(datum) + offset(datum));
    }
  };

export const messageTimeScale = (groupKey: string, data: Datum[]) => {
  const { offsetTopMap, offsetMap } = selectLayoutData(groupKey)(
    store.getState()
  );
  const { mode } = selectLayoutMode(groupKey)(store.getState());
  const y = getY(groupKey);

  return d3
    .scaleTime()
    .domain(data.map(([msg]) => msg.createdTimestamp))
    .range(
      data.map((datum) =>
        mode === "map"
          ? offsetTopMap[datum[0].id] - offsetMap[datum[0].id] + y(datum)
          : y(datum)
      )
    );
};
