import { useEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import { fetchChannels, selectChannels } from "../data/channels-slice";
import { fetchGuilds, selectGuilds } from "../data/guilds-slice";
import { useAppDispatch, useAppSelector } from "../hooks";

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const { guildId } = useParams();

  {
    const { isValid } = useAppSelector(selectGuilds);

    useEffect(() => {
      if (!guildId && !isValid) {
        dispatch(fetchGuilds());
      }
    }, [dispatch, isValid, guildId]);
  }

  {
    const { isValid } = useAppSelector(selectChannels(guildId!));

    useEffect(() => {
      if (guildId && !isValid) {
        dispatch(fetchChannels(guildId));
      }
    }, [dispatch, guildId, isValid]);
  }

  return <Outlet />;
};

export default Dashboard;
