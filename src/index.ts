import { SlashCommandBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import {
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  DiscordGatewayAdapterCreator,
  getVoiceConnection,
  joinVoiceChannel,
  NoSubscriberBehavior,
} from "@discordjs/voice";
import { Routes } from "discord-api-types/v9";
import {
  Awaitable,
  Client,
  CommandInteraction,
  EmbedBuilder,
  GatewayIntentBits,
  Partials,
  TextChannel,
} from "discord.js";
import fs from "fs";
import path from "path";
import { queue } from "./music";

const config = {
  token: "NzA4MDQ5NzY4NzU2MjgxNDM1.XrRsuw.luk3-rD3hfs9N17K67JNCv8odGE",
};

const rest = new REST({ version: "9" }).setToken(config.token);

const client = new Client({
  partials: [Partials.Channel],
  intents: [
    /*Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES */
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

const commands: {
  command: SlashCommandBuilder;
  onExecute: (options: CommandInteraction) => Awaitable<void>;
}[] = [];
const command_path = path.join(__dirname, "commands");
const sounds: { files: string[]; name: string; resource: AudioResource[] }[] =
  [];
let psa: {
  announcements: {
    channel: string;
    completed: boolean;
    values: [
      {
        embed?: EmbedBuilder;
        code?: string;
        text?: string;
      }
    ];
  }[];
} = { announcements: [] };
const root = path.join(__dirname, "..");
const psa_path = path.join(root, "psa.json");
const sounds_path = path.join(root, "sounds");

const ready_promises: Promise<void>[] = [];

ready_promises.push(
  new Promise((resolve, reject) => {
    fs.readdir(command_path, async (err, files) => {
      if (err) return reject(err);

      const command_files = files.filter(
        (file) => file.endsWith(".ts") || file.endsWith(".js")
      );

      for (const file of command_files) {
        const module = await import(path.join(command_path, file));
        commands.push(module);
      }

      commands.push({
        command: new SlashCommandBuilder()
          .setName("reload")
          .setDescription("Reload sound files"),
        onExecute: (interaction) => {
          interaction.deferReply();
          fs.readdir(sounds_path, async (err, files) => {
            if (err) return reject(err);

            files
              .filter((file) => file.endsWith(".mp3"))
              .forEach((file) => {
                const name = /([a-zA-Z\-_]+)/gm
                  .exec(file)![0]
                  .toLocaleLowerCase();
                const sound =
                  sounds.find((s) => s.name === name) ??
                  (sounds.push({ name, files: [], resource: [] }) > 0
                    ? sounds[sounds.length - 1]
                    : sounds[sounds.length - 1]);

                sound.files.push(file);
                sound.resource.push(
                  createAudioResource(path.join(sounds_path, file))
                );
              });

            console.log(sounds);

            resolve();
          });
        },
      });

      resolve();
    });
  })
);

ready_promises.push(
  new Promise((resolve, reject) => {
    fs.readdir(sounds_path, async (err, files) => {
      if (err) return reject(err);

      files
        .filter((file) => file.endsWith(".mp3"))
        .forEach((file) => {
          const name = /([a-zA-Z\-_]+)/gm.exec(file)![0].toLocaleLowerCase();
          const sound =
            sounds.find((s) => s.name === name) ??
            (sounds.push({ name, files: [], resource: [] }) > 0
              ? sounds[sounds.length - 1]
              : sounds[sounds.length - 1]);

          sound.files.push(file);
          sound.resource.push(
            createAudioResource(path.join(sounds_path, file))
          );
        });

      console.log(sounds);

      resolve();
    });
  })
);

ready_promises.push(
  new Promise(async (res, rej) => {
    fs.readFile(psa_path, (err, dat) => {
      if (err) return rej(err);

      psa = JSON.parse(dat.toString());

      res();
    });
  })
);

client.on("ready", async () => {
  console.log("Bot Ready");

  console.log(psa);
  for (let a of psa.announcements) {
    if (!a.completed) {
      const channel = client.channels.cache.get(a.channel);
      if (channel && channel.isTextBased()) {
        const text_channel = channel as TextChannel;
        text_channel.send('@everyone');

        for (let v of a.values) {
          if (v.embed) {
            text_channel.send({ embeds: [v.embed] });
          } else if (v.code) {
            text_channel.send("```" + v.code + "```");
          } else if (v.text) {
            text_channel.send(v.text);
          }
        }
        a.completed = true;

        fs.writeFileSync(psa_path, JSON.stringify(psa));
      }
    }
  }
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(client.user!.id), {
      body: commands.map((v) => v.command),
    });

    await rest.put(
      Routes.applicationGuildCommands(client.user!.id, "705288984800133141"),
      { body: commands.map((v) => v.command) }
    );

    await rest.put(
      Routes.applicationGuildCommands(client.user!.id, "921964025242341376"),
      { body: commands.map((v) => v.command) }
    );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
    console.dir(error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand())
    return commands
      .find((v) => v.command.name === interaction.commandName)
      ?.onExecute(interaction);
});

client.on("messageCreate", (message) => {
  if (message.channelId === "708330457602981900") {
    const parts = message.content.split(" ");
    const com = parts.shift();
    if (com === "say") {
      let channel = client.channels.cache.get(parts.shift()!);
      let c = channel as TextChannel;
      c.send(parts.join(" "));
    }
    return;
  }

  const voice_channel = message.member?.voice.channel;
  const sound = sounds.find(
    (s) => s.name == message.content.toLocaleLowerCase()
  );

  if (
    voice_channel &&
    sound &&
    message.guildId &&
    message.guild?.voiceAdapterCreator
  ) {
    if (queue.player) {
      const index = Math.floor(Math.random() * sound.files.length);
      const res = sound.resource[index];

      const old_player = queue.player;
      old_player.pause();

      queue.player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
      });
      const sub = queue.connection?.subscribe(queue.player);

      try {
        queue.player.on(AudioPlayerStatus.Idle, () => {
          sub?.unsubscribe();

          queue.player = old_player;
          queue.sub = queue.connection?.subscribe(queue.player);
          queue.player.unpause();
        });

        queue.player!.play(res);
      } catch (e) {
        console.error(e);
      }
    } else if (queue.connection == undefined) {
      queue.connection = joinVoiceChannel({
        adapterCreator: message.guild
          ?.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
        channelId: message.member.voice.channel.id,
        guildId: message.guildId,
        selfDeaf: false,
      });

      queue.player = createAudioPlayer();
      const sub = queue.connection?.subscribe(queue.player);

      const index = Math.floor(Math.random() * sound.files.length);
      const res = sound.resource[index];

      queue.player.on(AudioPlayerStatus.Idle, () => {
        sub?.unsubscribe();
      });

      // const audio_resource = createAudioResource(path.join(sounds_path, file))
      queue.player!.play(res);
    }

    // if (queue.connection == undefined) {
    //     const connection = joinVoiceChannel({
    //         adapterCreator: message.guild?.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
    //         channelId: message.member.voice.channel.id,
    //         guildId: message.guildId,
    //         selfDeaf: false
    //     })

    //     const player = createAudioPlayer()
    //     connection.subscribe(player)

    //     queue.connection = connection
    //     queue.player = player
    //     queue.songs = []
    // }

    // console.log(queue)
  }
});

Promise.all(ready_promises).then(client.login.bind(client, config.token));
