import { Container, Link, Typography } from "@mui/material";
import { useParams } from "react-router";
import { selectGuildById, selectGuilds } from "../../data/guilds-slice";
import { useAppSelector } from "../hooks";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const GuildOverview = () => {
  const { guildId } = useParams();
  const { pending, lastError } = useAppSelector(selectGuilds);
  const guildData = useAppSelector(selectGuildById(guildId!));
  return (
    <>
      <Link href="/dashboard">
        <ArrowBackIcon fontSize="small" sx={{ mb: -0.5 }} />
        Back to Dashboard
      </Link>
      <Container sx={{ mt: 1 }}>
        {pending && "Loading..."}
        {lastError && "Something went wrong"}
        {guildData && <Typography variant="h5">{guildData.name}</Typography>}
      </Container>
    </>
  );
};

export default GuildOverview;
