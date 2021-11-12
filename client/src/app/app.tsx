import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { Navbar } from "./components/navbar";
import { useAppDispatch } from "./hooks";
import { fetchCurrentUser } from "./data/current-user-slice";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Box } from "@mui/system";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#bab3d2",
    },
    secondary: {
      main: "#F43E5C",
    },
    background: {
      default: "#232530",
      paper: "#323441",
    },
  },
});

const App = () => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minWidth: 1000 }}>
        <Navbar />
        <Outlet />
      </Box>
    </ThemeProvider>
  );
};

export default App;
