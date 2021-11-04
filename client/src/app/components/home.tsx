import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import React from "react";

const Home = () => {
  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 6 }}>
      <Typography component="h1" variant="h2" align="center" gutterBottom>
        <b>Conv</b>ersation <b>Ex</b>plorer
      </Typography>
      <Typography
        variant="h5"
        align="center"
        color="textSecondary"
        component="p"
      >
        Make monitoring and moderating your guilds easier with live
        visualizations of state of the art conversation metrics and more.
      </Typography>
    </Container>
  );
};

export default Home;
