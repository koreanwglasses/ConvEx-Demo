import { PermissionString } from "discord.js";
import { Router } from "express";
import passport from "passport";
import { Strategy } from "passport-discord";
import config from "../config";
import { baseURL } from "../utils";
import { client } from "./bot";

////////////////
// MIDDLEWARE //
////////////////
