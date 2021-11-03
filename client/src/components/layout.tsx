import { CssBaseline, ThemeProvider } from "@material-ui/core";
import { createTheme } from "@material-ui/core/styles";
import React from "react";
import { Header } from "./header";

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

export const Layout = ({ children }: React.PropsWithChildren<unknown>) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Header />
    <main>{children}</main>
  </ThemeProvider>
);
