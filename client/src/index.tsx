import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./app/app";
import reportWebVitals from "./reportWebVitals";
import Dashboard from "./app/dashboard/dashboard";
import Home from "./app/components/home";
import { Provider } from "react-redux";
import { store } from "./app/store";
import GuildSelector from "./app/dashboard/guild-selector";
import GuildOverview from "./app/dashboard/guild-overview";

const DevRedirect = ({ path }: { path: string }) => {
  return (
    <>
      `Redirecting to $
      {
        (window.location.href =
          process.env.REACT_APP_BACKEND_HOST +
          path +
          "?origin=" +
          window.location.origin)
      }
      ...`
    </>
  );
};

ReactDOM.render(
  <Provider store={store}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />}>
            <Route index element={<GuildSelector />} />
            <Route path=":guildId" element={<GuildOverview />} />
          </Route>
        </Route>
        {process.env.NODE_ENV === "development" && (
          <>
            <Route path="/auth" element={<DevRedirect path="/auth" />} />
            <Route path="/invite" element={<DevRedirect path="/invite" />} />
            <Route path="/logout" element={<DevRedirect path="/logout" />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  </Provider>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
