import { Box } from "@mui/system";
import React from "react";

export const StickyWrapper = ({
  y,
  height,
  stickyTop = 0,
  children,
}: React.PropsWithChildren<{
  y: number;
  height: number;
  stickyTop?: number;
}>) => {
  return (
    <Box
      sx={{ position: "absolute", width: 1.0, pointerEvents: "none" }}
      style={{ top: y, height }}
    >
      <Box sx={{ position: "sticky", top: stickyTop, width: 1.0 }}>
        {children}
      </Box>
    </Box>
  );
};
