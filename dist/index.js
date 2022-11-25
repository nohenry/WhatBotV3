"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const builders_1 = require("@discordjs/builders");
const rest_1 = require("@discordjs/rest");
const voice_1 = require("@discordjs/voice");
const v9_1 = require("discord-api-types/v9");
const discord_js_1 = require("discord.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const music_1 = require("./music");
const config = {
    token: "NzA4MDQ5NzY4NzU2MjgxNDM1.XrRsuw.luk3-rD3hfs9N17K67JNCv8odGE",
};
const rest = new rest_1.REST({ version: "9" }).setToken(config.token);
const client = new discord_js_1.Client({
    partials: [discord_js_1.Partials.Channel],
    intents: [
        discord_js_1.GatewayIntentBits.DirectMessages,
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.GuildVoiceStates,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
const commands = [];
const command_path = path_1.default.join(__dirname, "commands");
const sounds = [];
let psa = { announcements: [] };
const root = path_1.default.join(__dirname, "..");
const psa_path = path_1.default.join(root, "psa.json");
const sounds_path = path_1.default.join(root, "sounds");
const ready_promises = [];
ready_promises.push(new Promise((resolve, reject) => {
    fs_1.default.readdir(command_path, async (err, files) => {
        var _a;
        if (err)
            return reject(err);
        const command_files = files.filter((file) => file.endsWith(".ts") || file.endsWith(".js"));
        for (const file of command_files) {
            const module = await (_a = path_1.default.join(command_path, file), Promise.resolve().then(() => __importStar(require(_a))));
            commands.push(module);
        }
        commands.push({
            command: new builders_1.SlashCommandBuilder()
                .setName("reload")
                .setDescription("Reload sound files"),
            onExecute: (interaction) => {
                interaction.deferReply();
                fs_1.default.readdir(sounds_path, async (err, files) => {
                    if (err)
                        return reject(err);
                    files
                        .filter((file) => file.endsWith(".mp3"))
                        .forEach((file) => {
                        const name = /([a-zA-Z\-_]+)/gm
                            .exec(file)[0]
                            .toLocaleLowerCase();
                        const sound = sounds.find((s) => s.name === name) ??
                            (sounds.push({ name, files: [], resource: [] }) > 0
                                ? sounds[sounds.length - 1]
                                : sounds[sounds.length - 1]);
                        sound.files.push(file);
                        sound.resource.push((0, voice_1.createAudioResource)(path_1.default.join(sounds_path, file)));
                    });
                    console.log(sounds);
                    resolve();
                });
            },
        });
        resolve();
    });
}));
ready_promises.push(new Promise((resolve, reject) => {
    fs_1.default.readdir(sounds_path, async (err, files) => {
        if (err)
            return reject(err);
        files
            .filter((file) => file.endsWith(".mp3"))
            .forEach((file) => {
            const name = /([a-zA-Z\-_]+)/gm.exec(file)[0].toLocaleLowerCase();
            const sound = sounds.find((s) => s.name === name) ??
                (sounds.push({ name, files: [], resource: [] }) > 0
                    ? sounds[sounds.length - 1]
                    : sounds[sounds.length - 1]);
            sound.files.push(file);
            sound.resource.push((0, voice_1.createAudioResource)(path_1.default.join(sounds_path, file)));
        });
        console.log(sounds);
        resolve();
    });
}));
ready_promises.push(new Promise(async (res, rej) => {
    fs_1.default.readFile(psa_path, (err, dat) => {
        if (err)
            return rej(err);
        psa = JSON.parse(dat.toString());
        res();
    });
}));
client.on("ready", async () => {
    console.log("Bot Ready");
    console.log(psa);
    for (let a of psa.announcements) {
        if (!a.completed) {
            const channel = client.channels.cache.get(a.channel);
            if (channel && channel.isTextBased()) {
                const text_channel = channel;
                text_channel.send('@everyone');
                for (let v of a.values) {
                    if (v.embed) {
                        text_channel.send({ embeds: [v.embed] });
                    }
                    else if (v.code) {
                        text_channel.send("```" + v.code + "```");
                    }
                    else if (v.text) {
                        text_channel.send(v.text);
                    }
                }
                a.completed = true;
                fs_1.default.writeFileSync(psa_path, JSON.stringify(psa));
            }
        }
    }
    try {
        console.log("Started refreshing application (/) commands.");
        await rest.put(v9_1.Routes.applicationCommands(client.user.id), {
            body: commands.map((v) => v.command),
        });
        await rest.put(v9_1.Routes.applicationGuildCommands(client.user.id, "705288984800133141"), { body: commands.map((v) => v.command) });
        await rest.put(v9_1.Routes.applicationGuildCommands(client.user.id, "921964025242341376"), { body: commands.map((v) => v.command) });
        console.log("Successfully reloaded application (/) commands.");
    }
    catch (error) {
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
            let channel = client.channels.cache.get(parts.shift());
            let c = channel;
            c.send(parts.join(" "));
        }
        return;
    }
    const voice_channel = message.member?.voice.channel;
    const sound = sounds.find((s) => s.name == message.content.toLocaleLowerCase());
    if (voice_channel &&
        sound &&
        message.guildId &&
        message.guild?.voiceAdapterCreator) {
        if (music_1.queue.player) {
            const index = Math.floor(Math.random() * sound.files.length);
            const res = sound.resource[index];
            const old_player = music_1.queue.player;
            old_player.pause();
            music_1.queue.player = (0, voice_1.createAudioPlayer)({
                behaviors: { noSubscriber: voice_1.NoSubscriberBehavior.Pause },
            });
            const sub = music_1.queue.connection?.subscribe(music_1.queue.player);
            try {
                music_1.queue.player.on(voice_1.AudioPlayerStatus.Idle, () => {
                    sub?.unsubscribe();
                    music_1.queue.player = old_player;
                    music_1.queue.sub = music_1.queue.connection?.subscribe(music_1.queue.player);
                    music_1.queue.player.unpause();
                });
                music_1.queue.player.play(res);
            }
            catch (e) {
                console.error(e);
            }
        }
        else if (music_1.queue.connection == undefined) {
            music_1.queue.connection = (0, voice_1.joinVoiceChannel)({
                adapterCreator: message.guild
                    ?.voiceAdapterCreator,
                channelId: message.member.voice.channel.id,
                guildId: message.guildId,
                selfDeaf: false,
            });
            music_1.queue.player = (0, voice_1.createAudioPlayer)();
            const sub = music_1.queue.connection?.subscribe(music_1.queue.player);
            const index = Math.floor(Math.random() * sound.files.length);
            const res = sound.resource[index];
            music_1.queue.player.on(voice_1.AudioPlayerStatus.Idle, () => {
                sub?.unsubscribe();
            });
            music_1.queue.player.play(res);
        }
    }
});
Promise.all(ready_promises).then(client.login.bind(client, config.token));
//# sourceMappingURL=index.js.map