import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { fetchGuilds, selectGuilds } from "../../data/guilds-slice";
import { useAppDispatch, useAppSelector } from "../hooks";

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const {
    pending,
    guildsData: guilds,
    lastError,
  } = useAppSelector(selectGuilds);

  useEffect(() => {
    if (!pending && !guilds && !lastError) {
      dispatch(fetchGuilds());
    }
  }, [dispatch, pending, guilds, lastError]);

  return <Outlet />;
};

export default Dashboard;
