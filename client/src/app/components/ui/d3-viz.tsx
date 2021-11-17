import React, { useEffect, useLayoutEffect, useRef } from "react";
import { useVizScrollerGroup } from "../../viz-scroller/viz-scroller-slice";
import { usePreviousValue } from "../../hooks";
import { VizScroller } from "../../viz-scroller/viz-scroller";

type DrawArgs<Datum> = {
  data: Datum[];
};

/**
 * Helper function for D3Viz component that allows for type inference between
 * initialize and draw while memoizing the draw function.
 *
 * Maybe in the future, React can infer the correct type for the useCallback
 * argument based on assignment, and this function won't be neccessary.
 */
export const drawCallback = <Datum, Selections extends Record<string, unknown>>(
  data: Datum[] | undefined,
  initialize: (svgRef: SVGSVGElement) => Selections,
  draw: (args: DrawArgs<Datum> & Selections) => void
) => {
  return draw;
};

type Props<Datum, Selections> = React.PropsWithChildren<{
  groupKey: string;
  data?: Datum[];
  initialize: (svgRef: SVGSVGElement) => Selections;
  draw: (args: DrawArgs<Datum> & Selections) => void;
  width: number;
  hidden?: boolean;
  before?: React.ReactNode;
}>;

export const D3Viz = <Datum, Selections extends Record<string, unknown>>({
  groupKey,
  data,
  initialize,
  draw,
  width,
  hidden = false,
  before,
  children,
}: Props<Datum, Selections>) => {
  ////////////
  // LAYOUT //
  ////////////

  const svgRef = useRef<SVGSVGElement>(null);
  const { offset, canvasHeight } = useVizScrollerGroup(groupKey);

  ///////////
  // CHART //
  ///////////

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
      if (!svgRef.current) return;
      selections.current = initialize(svgRef.current);
    }

    draw({
      data,
      ...selections.current,
    });

    svgRef.current?.style.setProperty("top", "0");
  }, [offset, data, draw, initialize]);

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
    >
      {before}
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
