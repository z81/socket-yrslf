import Discord from "discord.js";
import Twitch from "tmi.js";
import request from "request";
import { forkJoin } from "rxjs";
import { map, throwIfEmpty } from "rxjs/operators";
import { twitchClientConfig, twitchConfig, discordConfig } from "./config";
import { createDiscordMessageStream } from "./createDiscordMessageStream";
import { createTitchMessageStream } from "./createTitchMessageStream";

const discord = new Discord.Client();
const twitch = new Twitch.client(twitchClientConfig);

const discordMsg$ = createDiscordMessageStream(
  discord,
  discordConfig,
  twitchConfig
);
const twitchMsg$ = createTitchMessageStream(twitch);

forkJoin(twitch.connect(), discord.login(discordConfig.token))
  .pipe(
    map(
      () => discord.channels.get(discordConfig.channelId) as Discord.TextChannel
    ),
    throwIfEmpty(() => new Error("Channel not found"))
  )
  .subscribe(channel => {
    console.log("Connected");

    twitchMsg$.subscribe(({ message, username, avatar }) => {
      console.log(message);
      request({
        url: discordConfig.hookUrl,
        method: "POST",
        json: {
          content: message,
          username: `${username} twitch`,
          avatar_url: avatar
        }
      });

      // channel.send(message);
    });
    discordMsg$.subscribe(message => twitch.say(twitchConfig.channel, message));
  });
