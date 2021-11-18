import React, { useEffect, useLayoutEffect, useRef } from "react";
import { useVizScrollerGroup } from "../../viz-scroller/viz-scroller-slice";
import { usePreviousValue } from "../../hooks";
import { VizScroller } from "../../viz-scroller/viz-scroller";

/**
 * Helper function for D3Viz component that allows for type inference between
 * initialize and draw while memoizing the draw function.
 *
 * Maybe in the future, React can infer the correct type for the useCallback
 * argument based on assignment, and this function won't be neccessary.
 */
export const drawCallback = <Selections extends Record<string, unknown>>(
  initialize: (svgRef: SVGSVGElement) => Selections,
  draw: (selections: Selections) => void
) => {
  return draw;
};

type Props<Selections> = React.PropsWithChildren<{
  groupKey: string;
  initialize: (svgRef: SVGSVGElement) => Selections;
  draw: (selections: Selections) => void;
  width: number;
  hidden?: boolean;
  before?: React.ReactNode;
}>;

export const D3Viz = <Selections extends Record<string, unknown>>({
  groupKey,
  initialize,
  draw,
  width,
  hidden = false,
  before,
  children,
}: Props<Selections>) => {
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
    if (!selections.current) {
      if (!svgRef.current) return;
      selections.current = initialize(svgRef.current);
    }

    draw(selections.current);

    svgRef.current?.style.setProperty("top", "0");
  }, [offset, draw, initialize]);

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
