import {
  Alert,
  Avatar,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  Typography,
} from "@mui/material";
import { GuildData } from "../../common/api-data-types";
import { selectGuilds } from "../data/guilds-slice";
import { RouterLink } from "../components/ui/router-link-component";
import { useAppSelector } from "../hooks";

const GuildSelector = () => {
  const { guildsData, pending, lastError } = useAppSelector(selectGuilds);
  const guilds = guildsData ? Object.values(guildsData) : undefined;

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mt: 4 }} gutterBottom>
        Your Guilds
      </Typography>

      {lastError && (
        <Alert severity="error">There was a problem loading your guilds</Alert>
      )}

      {pending && <CircularProgress />}

      {guilds && !guilds.length && (
        <Typography variant="body1">
          <em>Nothing to show here</em>
        </Typography>
      )}

      {guilds && guilds.length && (
        <Grid container spacing={2}>
          {guilds.map((guild) => (
            <Grid item xs={2} key={guild.id}>
              <GuildCard guild={guild} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

const GuildCard = ({ guild }: { guild: GuildData }) => {
  return (
    <Card>
      <CardActionArea
        href={`/dashboard/${guild.id}`}
        LinkComponent={RouterLink}
      >
        <CardContent sx={{ textAlign: "center" }}>
          <Avatar
            alt={guild.name}
            src={guild.iconURL!}
            sx={{ width: 144, height: 144, fontSize: 48, mb: 1 }}
            variant="rounded"
          >
            {guild.name[0]}
          </Avatar>
          <Typography variant="subtitle1">{guild.name}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default GuildSelector;
