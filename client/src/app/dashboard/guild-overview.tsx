import { Container, Link, Typography } from "@mui/material";
import { useParams } from "react-router";
import { selectGuildById, selectGuilds } from "../data/guilds-slice";
import { useAppSelector } from "../hooks";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { RouterLink } from "../components/ui/router-link-component";
import { selectChannels } from "../data/channels-slice";
import { CondensedChannelView } from "./channel-view";

const GuildOverview = () => {
  const { guildId } = useParams();
  const { pending: guildPending, lastError: guildLastError } =
    useAppSelector(selectGuilds);
  const guildData = useAppSelector(selectGuildById(guildId!));

  const {
    pending: channelsPending,
    lastError: channelsLastError,
    channelsData,
  } = useAppSelector(selectChannels(guildId!));

  const channels = channelsData && Object.values(channelsData);

  return (
    <>
      <Link href="/dashboard" component={RouterLink}>
        <ArrowBackIcon fontSize="small" sx={{ mb: -0.5 }} />
        Back to Dashboard
      </Link>
      <Container sx={{ mt: 1 }} maxWidth="lg">
        {guildData && <Typography variant="h5">{guildData.name}</Typography>}
        {(guildPending || channelsPending) && "Loading..."}
        {(guildLastError || channelsLastError) && "Something went wrong"}

        {channels &&
          guildId &&
          channels.map((channel) => (
            <CondensedChannelView
              key={channel.id}
              channelId={channel.id}
              guildId={guildId}
            />
          ))}
      </Container>
    </>
  );
};

export default GuildOverview;
