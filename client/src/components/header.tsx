import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  makeStyles,
  Menu,
  MenuItem,
  Toolbar,
} from "@material-ui/core";
import { Skeleton } from "@material-ui/lab";
import { to } from "await-to-js";
import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  toolbarTitle: {
    flexGrow: 1,
    fontSize: 36,
  },
  button: {
    margin: theme.spacing(1, 1),
  },
  avatar: {
    margin: theme.spacing(1, 1),
  },
}));

export const Header = () => (
  <AppBar position="static">
    <Toolbar>
      <Title />
      <UserNav />
    </Toolbar>
  </AppBar>
);

const Title = () => {
  const classes = useStyles();
  return (
    <div className={classes.toolbarTitle}>
      <Box fontWeight={700} component="span">
        CONV
      </Box>
      <Box fontWeight={200} component="span">
        EX
      </Box>
    </div>
  );
};

const UserNav = () => {
  const [[err, user], setResult] = useState<[err?: Error | null, user?: any]>(
    []
  );
  useEffect(() => {
    to(fetch("/api/user/current")).then(setResult);
  }, []);

  return (
    <>
      <AddToServerButton />

      {!err && !user && (
        <>
          <DashboardPlaceholder />
          <AvatarPlaceholder />
        </>
      )}

      {!user && <LoginButton />}

      {user && (
        <>
          <DashboardButton />
          <AvatarMenu user={user} />
        </>
      )}
    </>
  );
};

export const LoginButton = () => {
  const classes = useStyles();
  return (
    <Button
      color="secondary"
      variant="contained"
      href={"/auth"}
      className={classes.button}
    >
      Login with Discord
    </Button>
  );
};

const DashboardPlaceholder = () => {
  const classes = useStyles();
  return (
    <Skeleton
      variant="rect"
      width={120}
      height={35}
      className={classes.button}
    />
  );
};

const AvatarPlaceholder = () => {
  const classes = useStyles();
  return (
    <Skeleton
      variant="circle"
      width={40}
      height={40}
      className={classes.avatar}
    />
  );
};

const AddToServerButton = () => {
  const classes = useStyles();
  return (
    <Button
      variant="outlined"
      className={classes.button}
      href={"/"}
      target="_blank"
      rel="noopener noreferrer"
    >
      Add to Server
    </Button>
  );
};

const DashboardButton = () => {
  const classes = useStyles();
  return (
    <Button
      color="secondary"
      variant="contained"
      component={RouterLink}
      to={"/dashboard"}
      className={classes.button}
    >
      Dashboard
    </Button>
  );
};

const AvatarMenu = ({ user }: { user: any }) => {
  const classes = useStyles();
  const [menuAnchor, setMenuAnchor] = useState<Element | null>(null);
  return (
    <>
      <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} size="small">
        <Avatar
          alt={`${user.username}#${user.discriminator}`}
          src={user.avatarURL}
          className={classes.avatar}
        ></Avatar>
      </IconButton>
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        keepMounted
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem component={"a"} href={"/logout"}>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
};
