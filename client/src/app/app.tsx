import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { CssBaseline, ThemeProvider } from "@material-ui/core";
import { createTheme } from "@material-ui/core/styles";
import { Navbar } from "./components/navbar";
import { useAppDispatch } from "./hooks";
import { fetchCurrentUser } from "../data/current-user-slice";

const theme = createTheme({
  palette: {
    type: "dark",
    primary: {
      main: "#2E303E",
    },
    secondary: {
      main: "#F43E5C",
      contrastText: "#fff",
    },
    background: { default: "#232530" },
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
      <Navbar />
      <Outlet />
    </ThemeProvider>
  );
};

export default App;
