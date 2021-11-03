import React from "react";
import { Outlet } from "react-router-dom";

import { CssBaseline, ThemeProvider } from "@material-ui/core";
import { createTheme } from "@material-ui/core/styles";
import { Header } from "./components/header";

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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Header />
      <Outlet />
    </ThemeProvider>
  );
};

export default App;
