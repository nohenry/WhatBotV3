"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onExecute = exports.command = void 0;
const builders_1 = require("@discordjs/builders");
const discord_js_1 = require("discord.js");
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const voice_1 = require("@discordjs/voice");
const stream_1 = require("stream");
const yt_1 = require("../yt");
const music_1 = require("../music");
exports.command = new builders_1.SlashCommandBuilder()
    .setName('stereo')
    .setDescription('Music stereo')
    .addSubcommand(subcommand => subcommand
    .setName('play')
    .setDescription('Play song')
    .addStringOption(option => option.setName('target')
    .setDescription('Url or search term to play')))
    .addSubcommand(subcommand => subcommand
    .setName('skip')
    .setDescription('Skip song'))
    .addSubcommand(subcommand => subcommand
    .setName('stop')
    .setDescription('Stop song'))
    .addSubcommand(subcommand => subcommand
    .setName('pause')
    .setDescription('Pause song'))
    .addSubcommand(subcommand => subcommand
    .setName('loop')
    .setDescription('Loop song or queue')
    .addBooleanOption(option => option
    .setName('queue')
    .setDescription('Set\'s the queue to loop instead of the song')))
    .addSubcommand(subcommand => subcommand
    .setName('noloop')
    .setDescription('Disable song or queue loop'))
    .addSubcommand(subcommand => subcommand
    .setName('clear')
    .setDescription('Clears the queue'))
    .addSubcommand(subcommand => subcommand
    .setName('current')
    .setDescription('Displays the currently playing song'))
    .addSubcommand(subcommand => subcommand
    .setName('seek')
    .setDescription('Seeks to the specified time')
    .addStringOption(option => option
    .setName('time')
    .setDescription('Time in the format m:s (minutes:seconds)')
    .setRequired(true)))
    .addSubcommand(subcommand => subcommand
    .setName('progress')
    .setDescription('Displays the current song\'s progress'));
const parseTarget = async (target) => {
    try {
        const url = new URL(target);
        const video = (await (0, yt_1.getFromId)(url.searchParams.get('v'), { key: 'AIzaSyA6M1UI6woCOk4qr4Ifi4dmtHZJREY0n-c', maxResults: 1, part: 'snippet,contentDetails' })).results[0];
        return video;
    }
    catch (error) {
        const result = (await (0, yt_1.search)(target, { key: 'AIzaSyA6M1UI6woCOk4qr4Ifi4dmtHZJREY0n-c', maxResults: 1, type: 'video' })).results[0];
        const video = (await (0, yt_1.getFromId)(result.id, { key: 'AIzaSyA6M1UI6woCOk4qr4Ifi4dmtHZJREY0n-c', maxResults: 1, part: 'snippet,contentDetails' })).results[0];
        return video;
    }
};
const play = async (target) => {
    const readable = new stream_1.Readable();
    readable._read = () => { };
    const resource = (0, ytdl_core_1.default)(target.link, { filter: 'audioonly' });
    resource.on('data', chunk => readable.push(chunk));
    resource.on('close', () => readable.push(null));
    const discordResource = (0, voice_1.createAudioResource)(readable);
    music_1.queue.player.play(discordResource);
};
const time = () => {
    if (music_1.queue.player.state.status == voice_1.AudioPlayerStatus.Playing) {
        return music_1.queue.player.state.playbackDuration;
    }
    else {
        return 0;
    }
};
const progress = (spaces) => {
    let string = '';
    const diff = time();
    const max = music_1.queue.songs[0].durationMs;
    const n = spaces * diff / max;
    const mcurr = Math.round(diff / 1000 / 60);
    const scurr = Math.round(diff / 1000) % 60;
    const mmax = Math.round(max / 1000 / 60);
    const smax = Math.round(max / 1000) % 60;
    string += '[' + '='.repeat(n) + '>' + ' '.repeat(spaces - n) + '] [' + `${mcurr}:${scurr.toString().padStart(2, '0')}/${mmax}:${smax.toString().padStart(2, '0')}]`;
    return string;
};
const onExecute = async (_interaction) => {
    const guild = _interaction.client.guilds.cache.get(_interaction.guild.id);
    const member = guild.members.cache.get(_interaction.member.user.id);
    const voiceChannel = member.voice.channel;
    if (!voiceChannel)
        return;
    if (!_interaction.isChatInputCommand())
        return;
    const interaction = _interaction;
    await interaction.deferReply();
    try {
        switch (interaction.options.getSubcommand()) {
            case 'play': {
                const ptarget = interaction.options.getString('target');
                if (ptarget) {
                    const target = parseTarget(ptarget);
                    console.log(interaction.client.channels);
                    if (music_1.queue.connection === undefined || interaction.client.voice.adapters.size == 0) {
                        console.log('joined vc');
                        music_1.queue.connection = (0, voice_1.joinVoiceChannel)({
                            adapterCreator: guild.voiceAdapterCreator,
                            channelId: voiceChannel.id,
                            guildId: guild.id,
                            selfDeaf: false
                        });
                        music_1.queue.songs = [];
                        const player = (0, voice_1.createAudioPlayer)({ behaviors: { noSubscriber: voice_1.NoSubscriberBehavior.Pause } });
                        music_1.queue.sub = music_1.queue.connection.subscribe(player);
                        music_1.queue.player = player;
                        music_1.queue.player.on(voice_1.AudioPlayerStatus.Idle, () => {
                            music_1.queue.songs.shift();
                            if (music_1.queue.songs.length > 0)
                                play(music_1.queue.songs[0]);
                        });
                        music_1.queue.player.on('error', error => {
                            console.error('Error:', error.message, 'with track');
                        });
                    }
                    const yttarget = await target;
                    console.log(yttarget);
                    if (yttarget === undefined) {
                        interaction.editReply("I'm sorry, youtube is an having a tantrum, please try again!");
                        return;
                    }
                    music_1.queue.songs.push(yttarget);
                    let embed;
                    if (music_1.queue.player.state.status === voice_1.AudioPlayerStatus.Idle) {
                        play(music_1.queue.songs[0]);
                        embed = new discord_js_1.EmbedBuilder()
                            .setColor('#620043')
                            .setTitle('Playing: ' + yttarget.title)
                            .setImage((yttarget.thumbnails.high?.url || yttarget.thumbnails.standard?.url))
                            .setAuthor({ name: yttarget.channelTitle })
                            .setDescription(yttarget.duration.length == 0 ? '--' : yttarget.duration);
                    }
                    else {
                        embed = new discord_js_1.EmbedBuilder()
                            .setColor('#620043')
                            .setTitle('Queued: ' + yttarget.title)
                            .setImage((yttarget.thumbnails.high?.url || yttarget.thumbnails.standard?.url))
                            .setAuthor({ name: yttarget.channelTitle })
                            .setDescription(yttarget.duration.length == 0 ? '--' : yttarget.duration)
                            .setFields({ name: 'Will play:', value: `${music_1.queue.songs.length - 1} more to go` });
                    }
                    console.log(embed);
                    interaction.editReply({ embeds: [embed] });
                }
                else {
                    music_1.queue.player.unpause();
                    interaction.deleteReply();
                }
                break;
            }
            case 'skip': {
                if (music_1.queue.player.state.status != voice_1.AudioPlayerStatus.Idle) {
                    const current = music_1.queue.songs[0];
                    music_1.queue.player.stop();
                    interaction.editReply(`Skipped: ${current.title}`);
                    music_1.queue.songs.shift();
                    if (music_1.queue.songs.length > 0)
                        play(music_1.queue.songs[0]);
                }
                else
                    interaction.editReply('No song to skip!');
                break;
            }
            case 'stop': {
                music_1.queue.songs = [];
                music_1.queue.player.stop();
                interaction.editReply('Stopped queue');
                break;
            }
            case 'pause': {
                const pause = music_1.queue.player.pause();
                if (pause)
                    interaction.editReply(`Paused: ${music_1.queue.songs[0].title}`);
                else
                    interaction.deleteReply();
                break;
            }
            case 'loop': {
                break;
            }
            case 'clear': {
                const current = music_1.queue.songs.shift();
                music_1.queue.songs = [current];
                break;
            }
            case 'current': {
                if (music_1.queue.songs.length > 0) {
                    const playing = music_1.queue.songs[0];
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor('#620043')
                        .setTitle(playing.title)
                        .setImage((playing.thumbnails.high?.url || playing.thumbnails.standard?.url))
                        .setAuthor({ name: playing.channelTitle })
                        .setDescription(playing.duration);
                    interaction.editReply({ embeds: [embed] });
                }
                else {
                    interaction.editReply('No song currently playing!');
                }
                break;
            }
            case 'progress': {
                if (music_1.queue.songs.length > 0) {
                    const playing = music_1.queue.songs[0];
                    const prog = progress(30);
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor('#620043')
                        .setTitle(playing.title)
                        .setAuthor({ name: playing.channelTitle })
                        .setFields({ name: 'progress', value: prog });
                    interaction.editReply({ embeds: [embed] });
                }
                else {
                    interaction.deleteReply();
                }
                break;
            }
        }
    }
    catch (error) {
        console.error(error);
        interaction.editReply('There was an error with the command! Please try again.');
    }
};
exports.onExecute = onExecute;
//# sourceMappingURL=stereo.js.map