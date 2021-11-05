import { Box, SxProps } from "@mui/system";
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
  const { height, offset, maxScrollOffset } = useAppSelector(
    selectVizScrollerGroup(groupKey)
  );

  const dispatch = useAppDispatch();
  const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    const scrollFromTop =
      e.currentTarget.scrollHeight +
      e.currentTarget.scrollTop -
      e.currentTarget.clientHeight -
      height;
    if (
      scrollFromTop < height / 2 &&
      (!maxScrollOffset || offset + 3 * height < maxScrollOffset)
    ) {
      dispatch(
        adjustScrollOffset({
          key: groupKey,
          amount: height / 2,
        })
      );
    } else if (scrollFromTop > (3 * height) / 2 && offset > 0) {
      dispatch(
        adjustScrollOffset({
          key: groupKey,
          amount: -height / 2,
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
          height: Math.min(
            4 * height + offset,
            maxScrollOffset ?? Number.POSITIVE_INFINITY
          ),
          flexShrink: 0,
          display: "flex",
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
  sx={}
}: {
  groupKey: string;
  children:
    | React.ReactNode
    | (({ offset }: { offset: number }) => React.ReactNode);
  fixedBaseline?: boolean;
  sx?: SxProps
}) => {
  const { height, offset, maxScrollOffset } = useAppSelector(
    selectVizScrollerGroup(groupKey)
  );

  return (
    <Box
      sx={{
        top: Math.min(
          maxScrollOffset
            ? maxScrollOffset - 3 * height - offset
            : Number.POSITIVE_INFINITY,
          height
        ),
        height: fixedBaseline ? 3 * height + offset : 3 * height,
        overflowY: "hidden",
        display: "flex",
        flexFlow: "column-reverse",
        position: "relative",
        ...sx
      }}
    >
      {typeof children === "function" ? children({ offset }) : children}
    </Box>
  );
};
