import {
  Box,
  IconButton,
  Popper,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { Check, ReportProblem, Settings } from "@mui/icons-material";
import { useEffect, useRef, useState } from "react";
import { Form } from "./styled";
import { fetchJSON } from "../../utils";

const GuildSettings = ({ guildId }: { guildId: string }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [initialValues, setInitialValues] = useState<{ keywords: string[] }>();
  useEffect(() => {
    (async () => {
      const [, val] = await fetchJSON("/api/options/guild", { guildId });
      setInitialValues(val);
    })();
  }, [guildId]);

  return (
    <Box>
      <IconButton ref={buttonRef} onClick={() => setOpen(!open)}>
        <Settings />
      </IconButton>
      <Popper open={open} placement="bottom" anchorEl={buttonRef.current}>
        <Paper
          sx={{
            width: 300,
          }}
          elevation={8}
        >
          {initialValues && (
            <SettingsForm guildId={guildId} initialValues={initialValues} />
          )}
        </Paper>
      </Popper>
    </Box>
  );
};

export default GuildSettings;

const SettingsForm = ({
  guildId,
  initialValues,
}: {
  guildId: string;
  initialValues: { keywords: string[] };
}) => {
  const [waiting, setWaiting] = useState(false);
  const [err, setErr] = useState<Error | null>(null);

  return (
    <Form
      sx={{
        p: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
      }}
      onSubmit={async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(
          new FormData(e.target as HTMLFormElement).entries()
        );

        setWaiting(true);
        setErr(null);
        const [err] = await fetchJSON("/api/options/guild", {
          guildId,
          options: {
            keywords: (data.keywords as string).split(" ").filter((s) => s),
          },
        });
        if (err) setErr(err as Error);
        setWaiting(false);
      }}
    >
      <Typography>Settings</Typography>
      <TextField
        fullWidth
        label={"Keywords"}
        helperText={"Input keywords to track/highlight, separated by spaces"}
        name="keywords"
        defaultValue={initialValues.keywords.join(" ") ?? ""}
      />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button type="submit">Save</Button>
        {waiting ? (
          <CircularProgress size={16} sx={{ ml: 0.5 }} />
        ) : err ? (
          <Tooltip title={err.message}>
            <ReportProblem fontSize="small" sx={{ opacity: 0.5 }} />
          </Tooltip>
        ) : (
          <Check fontSize="small" sx={{ opacity: 0.5 }} />
        )}
      </Box>
    </Form>
  );
};
