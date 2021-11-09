import { Box, Link, Typography } from "@mui/material";
import { useParams } from "react-router";
import { selectGuildById, selectGuilds } from "../data/guilds-slice";
import { useAppSelector } from "../hooks";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { RouterLink } from "../components/ui/router-link-component";
import { selectChannels } from "../data/channels-slice";
import { ChannelCard } from "./channel/channel-card";

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
      <Box sx={{ mt: 1 }}>
        <Link href="/dashboard" component={RouterLink}>
          <ArrowBackIcon fontSize="small" sx={{ mb: -0.5 }} />
          Back to Guilds
        </Link>
      </Box>
      <Box sx={{ m: 1 }}>
        {guildData && (
          <Typography variant="h5" gutterBottom>
            {guildData.name}
          </Typography>
        )}
        {(guildPending || channelsPending) && "Loading..."}
        {(guildLastError || channelsLastError) && "Something went wrong"}

        {channels && guildId && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              justifyContent: "center",
              // flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            {channels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channelId={channel.id}
                guildId={guildId}
              />
            ))}
          </Box>
        )}
      </Box>
    </>
  );
};

export default GuildOverview;
