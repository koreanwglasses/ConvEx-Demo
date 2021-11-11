import { Box } from "@mui/system";
import React from "react";

export const StickyWrapper = ({
  y,
  height,
  children,
}: React.PropsWithChildren<{ y: number; height: number }>) => {
  return (
    <Box
      sx={{ position: "absolute", width: 1.0, pointerEvents: "none" }}
      style={{ top: y, height }}
    >
      <Box sx={{ position: "sticky", top: 0, width: 1.0 }}>{children}</Box>
    </Box>
  );
};
