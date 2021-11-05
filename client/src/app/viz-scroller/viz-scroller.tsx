import { Box } from "@mui/system";
import React, { UIEvent } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  selectVizScrollerGroup,
  adjustScrollOffset,
} from "./viz-scroller-slice";

export interface VizScrollHandler {
  (event: UIEvent<HTMLDivElement> & { scrollFromTop: number }): void;
}

export const VizGroupContainer = ({
  groupKey,
  onScroll: onScroll_,
  children,
}: React.PropsWithChildren<{
  groupKey: string;
  onScroll?: VizScrollHandler;
  fixedBaseline?: boolean;
}>) => {
  const { height, offset, maxOffset } = useAppSelector(
    selectVizScrollerGroup(groupKey)
  );

  const dispatch = useAppDispatch();
  const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    const scrollFromTop =
      e.currentTarget.scrollHeight +
      e.currentTarget.scrollTop -
      e.currentTarget.clientHeight;
    if (scrollFromTop < height / 2 && (!maxOffset || offset < maxOffset)) {
      dispatch(
        adjustScrollOffset({
          key: groupKey,
          amount: height,
        })
      );
    } else if (scrollFromTop > (3 * height) / 2 && offset > 0) {
      dispatch(
        adjustScrollOffset({
          key: groupKey,
          amount: -height,
        })
      );
    }
    onScroll_ && onScroll_(Object.assign(e, { scrollFromTop }));
  };

  return (
    <Box
      sx={{
        height,
        overflowY: "scroll",
        scrollbarWidth: "none",
        display: "flex",
        flexFlow: "column-reverse",
        "::-webkit-scrollbar": {
          display: "none",
        },
      }}
      onScroll={onScroll}
    >
      <div
        style={{
          height: 3 * height + offset,
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </Box>
  );
};

export const VizScroller = ({
  groupKey,
  children,
  fixedBaseline = false,
}: {
  groupKey: string;
  children:
    | React.ReactNode
    | (({ offset }: { offset: number }) => React.ReactNode);
  fixedBaseline?: boolean;
}) => {
  const { height, offset } = useAppSelector(selectVizScrollerGroup(groupKey));

  return (
    <div
      style={{
        height: fixedBaseline ? 3 * height + offset : 3 * height,
        overflowY: "hidden",
        display: "flex",
        flexFlow: "column-reverse",
        position: "relative",
      }}
    >
      {typeof children === "function" ? children({ offset }) : children}
    </div>
  );
};
