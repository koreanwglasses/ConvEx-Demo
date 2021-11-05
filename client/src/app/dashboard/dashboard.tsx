import { useEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import { fetchChannels, selectChannels } from "../data/channels-slice";
import { fetchGuilds, selectGuilds } from "../data/guilds-slice";
import { useAppDispatch, useAppSelector } from "../hooks";

const Dashboard = () => {
  const dispatch = useAppDispatch();

  {
    const { valid: isValid } = useAppSelector(selectGuilds);

    useEffect(() => {
      if (!isValid) {
        dispatch(fetchGuilds());
      }
    }, [dispatch, isValid]);
  }

  {
    const { guildId } = useParams();
    const { valid: isValid } = useAppSelector(selectChannels(guildId!));

    useEffect(() => {
      if (guildId && !isValid) {
        dispatch(fetchChannels(guildId));
      }
    }, [dispatch, guildId, isValid]);
  }

  return <Outlet />;
};

export default Dashboard;
