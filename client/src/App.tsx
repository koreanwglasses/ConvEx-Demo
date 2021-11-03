import React from "react";
import "./App.css";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Index from "./routes/index";

const App = () => {
  return (
    <Router>
      <Switch>
        {process.env.NODE_ENV === "development" && (
          <Route
            exact
            path={["/auth", "/logout"]}
            render={(props) =>
              `Redirecting to ${(window.location.href =
                process.env.REACT_APP_BACKEND_HOST +
                props.location.pathname +
                "?origin=" +
                window.location.origin)}...`
            }
          />
        )}
        <Route exact path="/">
          <Index />
        </Route>
      </Switch>
    </Router>
  );
};

export default App;
