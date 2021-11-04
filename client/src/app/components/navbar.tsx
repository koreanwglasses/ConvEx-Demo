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
import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { User } from "discord.js";
import { APIData } from "../../utils";
import { useAppSelector } from "../hooks";
import { logout, selectCurrentUser } from "../../data/current-user-slice";
import { useDispatch } from "react-redux";

const useStyles = makeStyles((theme) => ({
  toolbarTitleContainer: {
    flexGrow: 1,
  },
  toolbarTitle: {
    fontSize: 36,
    color: "white",
    textDecoration: "none",
  },
  button: {
    margin: theme.spacing(1, 1),
  },
  avatar: {
    margin: theme.spacing(1, 1),
  },
}));

export const Navbar = () => (
  <AppBar position="static">
    <Toolbar>
      <Title />
      <Actions />
    </Toolbar>
  </AppBar>
);

const Title = () => {
  const classes = useStyles();
  return (
    <div className={classes.toolbarTitleContainer}>
      <a className={classes.toolbarTitle} href={"/"}>
        <Box fontWeight={700} component="span">
          CONV
        </Box>
        <Box fontWeight={200} component="span">
          EX
        </Box>
      </a>
    </div>
  );
};

const Actions = () => {
  const { pending, userData } = useAppSelector(selectCurrentUser);

  return (
    <>
      <AddToServerButton />

      {pending && (
        <>
          <DashboardPlaceholder />
          <AvatarPlaceholder />
        </>
      )}

      {!pending && !userData && <LoginButton />}

      {userData && (
        <>
          <DashboardButton />
          <AvatarMenu user={userData} />
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
      href={"/invite"}
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

const AvatarMenu = ({ user }: { user: APIData<User> }) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const [menuAnchor, setMenuAnchor] = useState<Element | null>(null);

  return (
    <>
      <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} size="small">
        <Avatar
          alt={`${user.username}#${user.discriminator}`}
          src={user.avatarURL!}
          className={classes.avatar}
        ></Avatar>
      </IconButton>
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        keepMounted
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          component={"a"}
          href={"/logout"}
          onClick={() => dispatch(logout())}
        >
          Logout
        </MenuItem>
      </Menu>
    </>
  );
};
