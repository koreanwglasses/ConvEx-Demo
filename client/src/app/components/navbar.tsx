import React, { useState } from "react";
import { useParams, Link as RouterLink, useLocation } from "react-router-dom";
import { useAppSelector } from "../hooks";
import { logout, selectCurrentUser } from "../data/current-user-slice";
import { useDispatch } from "react-redux";
import { makeStyles } from "@mui/styles";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { styled } from "@mui/system";
import { UserData } from "../../common/api-data-types";
import { Divider, Typography, Link, Breadcrumbs } from "@mui/material";
import { selectGuildById } from "../data/guilds-slice";
import { NavigateNext } from "@mui/icons-material";

const useStyles = makeStyles({
  toolbarTitle: {
    fontSize: 36,
    color: "white",
    textDecoration: "none",
  },
});

const AppBar = styled(MuiAppBar)(({ theme }) => ({
  zIndex: (theme.zIndex as any).drawer + 1,
}));

export const Navbar = () => (
  <AppBar position="static">
    <Toolbar sx={{ gap: 2 }}>
      <Title />
      <DashboardTitle />
      <Box sx={{ flexGrow: 1 }} />
      <Actions />
    </Toolbar>
  </AppBar>
);

const DashboardTitle = () => {
  const path = useLocation().pathname.split("/").slice(1);
  const { guildId } = useParams();
  const guildData = useAppSelector(selectGuildById(guildId));
  return (
    <>
      {(path[0] === "dashboard" || guildId) && (
        <>
          <Divider orientation="vertical" flexItem />
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            <Link
              underline="hover"
              color="inherit"
              component={React.forwardRef((props: any, ref) => (
                <RouterLink to={"/dashboard"} {...props} ref={ref} />
              ))}
            >
              Your Guilds
            </Link>
            {guildId && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Avatar
                  src={guildData?.iconURL}
                  sx={{ width: 28, height: 28 }}
                />
                <Typography>{guildData?.name}</Typography>
              </Box>
            )}
          </Breadcrumbs>
        </>
      )}
    </>
  );
};

const Title = () => {
  const classes = useStyles();
  return (
    <div>
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
    <Box>
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
    </Box>
  );
};

export const LoginButton = () => {
  return (
    <Button color="secondary" variant="contained" href={"/auth"} sx={{ m: 1 }}>
      Login with Discord
    </Button>
  );
};

const DashboardPlaceholder = () => {
  return (
    <Skeleton variant="rectangular" sx={{ m: 1, width: 120, height: 35 }} />
  );
};

const AvatarPlaceholder = () => {
  return <Skeleton variant="circular" width={40} height={40} sx={{ m: 1 }} />;
};

const AddToServerButton = () => {
  return (
    <Button
      variant="outlined"
      sx={{ m: 1 }}
      href={"/invite"}
      target="_blank"
      rel="noopener noreferrer"
    >
      Add to Server
    </Button>
  );
};

const DashboardButton = () => {
  return (
    <Button
      color="secondary"
      variant="contained"
      component={RouterLink}
      to={"/dashboard"}
      sx={{ m: 1 }}
    >
      Dashboard
    </Button>
  );
};

const AvatarMenu = ({ user }: { user: UserData }) => {
  const dispatch = useDispatch();

  const [menuAnchor, setMenuAnchor] = useState<Element | null>(null);

  return (
    <>
      <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} size="small">
        <Avatar
          alt={`${user.username}#${user.discriminator}`}
          src={user.avatarURL!}
          sx={{ m: 1 }}
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
