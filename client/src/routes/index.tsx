import { Container, makeStyles, Typography } from "@material-ui/core";
import React from "react";
import { Layout } from "../components/layout";

const useStyles = makeStyles((theme) => ({
  heroContent: {
    padding: theme.spacing(8, 0, 6),
  },
}));

const Component = () => {
  const classes = useStyles();
  return (
    <Layout>
      <Container maxWidth="sm" className={classes.heroContent}>
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
    </Layout>
  );
};

export default Component;
