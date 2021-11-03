import React from "react";
import logo from "./logo.svg";
import "./App.css";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

function App() {
  return (
    <Router>
      <Switch>
        <Route
          exact
          path="/auth"
          render={() =>
            (window.location.href = `http://localhost:4000/auth?origin=${window.location.origin}`)
          }
        />
        <Route exact path="/">
          index
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
