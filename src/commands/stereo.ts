import { SlashCommandBuilder } from '@discordjs/builders'
import { ChatInputCommandInteraction, CommandInteraction, EmbedBuilder, InteractionResponseType } from 'discord.js'
import ytdl, { } from 'ytdl-core'
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, joinVoiceChannel, NoSubscriberBehavior } from '@discordjs/voice'
import { Readable } from 'stream'
import { getFromId, search, YouTubeSearchResults } from '../yt'
import { queue } from '../music'


export const command = new SlashCommandBuilder()
    .setName('stereo')
    .setDescription('Music stereo')
    .addSubcommand(subcommand =>
        subcommand
            .setName('play')
            .setDescription('Play song')
            .addStringOption(option =>
                option.setName('target')
                    .setDescription('Url or search term to play')
            ))
    .addSubcommand(subcommand =>
        subcommand
            .setName('skip')
            .setDescription('Skip song')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('stop')
            .setDescription('Stop song')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('pause')
            .setDescription('Pause song')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('loop')
            .setDescription('Loop song or queue')
            .addBooleanOption(option =>
                option
                    .setName('queue')
                    .setDescription('Set\'s the queue to loop instead of the song')
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('noloop')
            .setDescription('Disable song or queue loop')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('clear')
            .setDescription('Clears the queue')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('current')
            .setDescription('Displays the currently playing song')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('seek')
            .setDescription('Seeks to the specified time')
            .addStringOption(option =>
                option
                    .setName('time')
                    .setDescription('Time in the format m:s (minutes:seconds)')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('progress')
            .setDescription('Displays the current song\'s progress')
    )

const parseTarget = async (target: string) => {
    try {
        const url = new URL(target)
        const video = (await getFromId(url.searchParams.get('v')!, { key: 'AIzaSyA6M1UI6woCOk4qr4Ifi4dmtHZJREY0n-c', maxResults: 1, part: 'snippet,contentDetails' })).results[0]
        return video
    } catch (error) {
        const result = (await search(target, { key: 'AIzaSyA6M1UI6woCOk4qr4Ifi4dmtHZJREY0n-c', maxResults: 1, type: 'video' })).results[0]
        const video = (await getFromId(result.id, { key: 'AIzaSyA6M1UI6woCOk4qr4Ifi4dmtHZJREY0n-c', maxResults: 1, part: 'snippet,contentDetails' })).results[0]
        return video
    }
}

// Play function to play a song
const play = async (target: YouTubeSearchResults) => {
    const readable = new Readable()
    readable._read = () => { }

    const resource = ytdl(target.link, { filter: 'audioonly' })
    resource.on('data', chunk => readable.push(chunk))
    resource.on('close', () => readable.push(null))

    const discordResource = createAudioResource(readable)

    queue.player!.play(discordResource)
}

const time = (): number => {
    if (queue.player!.state.status == AudioPlayerStatus.Playing) {
        return queue.player!.state.playbackDuration
    } else {
        return 0
    }
}

const progress = (spaces: number) => {
    let string = ''
    const diff = time()
    const max = queue.songs![0].durationMs
    const n = spaces * diff / max

    const mcurr = Math.round(diff / 1000 / 60)
    const scurr = Math.round(diff / 1000) % 60
    const mmax = Math.round(max / 1000 / 60)
    const smax = Math.round(max / 1000) % 60
    string += '[' + '='.repeat(n) + '>' + ' '.repeat(spaces - n) + '] [' + `${mcurr}:${scurr.toString().padStart(2, '0')}/${mmax}:${smax.toString().padStart(2, '0')}]`
    return string
}

export const onExecute = async (_interaction: CommandInteraction) => {
    const guild = _interaction.client.guilds.cache.get(_interaction.guild!.id)!
    const member = guild.members.cache.get(_interaction.member!.user.id)
    const voiceChannel = member!.voice.channel

    if (!voiceChannel) return
    if (!_interaction.isChatInputCommand()) return;

    const interaction = _interaction as ChatInputCommandInteraction;

    await interaction.deferReply()
    try {
        // switch (interaction.options.getSubcommand()!) {
        switch (interaction.options.getSubcommand()) {
            case 'play': {
                const ptarget = interaction.options.getString('target')
                // const ptarget = "";
                if (ptarget) {
                    const target = parseTarget(ptarget)

                    console.log(interaction.client.channels)
                    // console.log(!interaction.client.voice.adapters.has(voiceChannel.id) , queue.connection );
                    if (queue.connection === undefined || interaction.client.voice.adapters.size == 0) {
                        // Connects to vc
                        console.log('joined vc')
                        queue.connection = joinVoiceChannel({
                            adapterCreator: guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
                            channelId: voiceChannel.id,
                            guildId: guild.id,
                            selfDeaf: false
                        })
                        queue.songs = []
                        // Creates the audio player
                        const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } })
                        queue.sub = queue.connection.subscribe(player)
                        queue.player = player

                        // When song ends play the next
                        queue.player.on(AudioPlayerStatus.Idle, () => {
                            queue.songs!.shift()
                            if (queue.songs!.length > 0)
                                play(queue.songs![0])
                        })

                        queue.player.on('error', error => {
                            console.error('Error:', error.message, 'with track');
                        });
                    }


                    const yttarget = await target
                    console.log(yttarget)

                    if (yttarget === undefined) {
                        interaction.editReply("I'm sorry, youtube is an having a tantrum, please try again!")
                        return;
                    }

                    queue.songs!.push(yttarget)
                    let embed: EmbedBuilder

                    if (queue.player!.state.status === AudioPlayerStatus.Idle) {
                        play(queue.songs![0])

                        embed = new EmbedBuilder()
                            .setColor('#620043')
                            .setTitle('Playing: ' + yttarget.title)
                            .setImage((yttarget.thumbnails.high?.url || yttarget.thumbnails.standard?.url)!)
                            .setAuthor({ name: yttarget.channelTitle })
                            .setDescription(yttarget.duration.length == 0 ? '--' : yttarget.duration)
                    } else {
                        embed = new EmbedBuilder()
                            .setColor('#620043')
                            .setTitle('Queued: ' + yttarget.title)
                            .setImage((yttarget.thumbnails.high?.url || yttarget.thumbnails.standard?.url)!)
                            .setAuthor({ name: yttarget.channelTitle })
                            .setDescription(yttarget.duration.length == 0 ? '--' : yttarget.duration)
                            .setFields({ name: 'Will play:', value: `${queue.songs!.length - 1} more to go` })
                    }

                    console.log(embed)

                    interaction.editReply({ embeds: [embed] })
                } else {
                    queue.player!.unpause()
                    interaction.deleteReply()
                }
                break
            }
            case 'skip': {
                if (queue.player!.state.status != AudioPlayerStatus.Idle) {
                    const current = queue.songs![0]
                    queue.player!.stop()
                    interaction.editReply(`Skipped: ${current.title}`)


                    queue.songs!.shift()
                    if (queue.songs!.length > 0)
                        play(queue.songs![0])
                }
                else interaction.editReply('No song to skip!')
                break
            } case 'stop': {
                queue.songs = []
                queue.player!.stop()
                interaction.editReply('Stopped queue')
                break
            } case 'pause': {
                const pause = queue.player!.pause()
                if (pause) interaction.editReply(`Paused: ${queue.songs![0].title}`)
                else interaction.deleteReply()
                break
            } case 'loop': {
                break
            } case 'clear': {
                const current = queue.songs!.shift()
                queue.songs = [current!]
                break
            }
            case 'current': {
                if (queue.songs!.length > 0) {
                    const playing = queue.songs![0]
                    const embed = new EmbedBuilder()
                        .setColor('#620043')
                        .setTitle(playing.title)
                        .setImage((playing.thumbnails.high?.url || playing.thumbnails.standard?.url)!)
                        .setAuthor({ name: playing.channelTitle })
                        .setDescription(playing.duration)

                    interaction.editReply({ embeds: [embed] })
                } else {
                    interaction.editReply('No song currently playing!')
                }
                break
            }
            // } case 'seek': {
            //     const time = interaction.options.getString('time')!
            //     const spt = time.split(':')
            //     const minute = parseInt(spt[0])
            //     const second = parseInt(spt[1])
            //     const sum = (minute * 60 + second) * 1000
            //     guildQueue?.seek(sum)
            //     interaction.editReply(`Seeked to: ${minute}:${second}`)
            //     break
            // }
            case 'progress': {
                if (queue.songs!.length > 0) {
                    const playing = queue.songs![0]
                    const prog = progress(30)

                    const embed = new EmbedBuilder()
                        .setColor('#620043')
                        .setTitle(playing.title)
                        .setAuthor({ name: playing.channelTitle })
                        .setFields({ name: 'progress', value: prog })

                    interaction.editReply({ embeds: [embed] })
                } else {
                    interaction.deleteReply()
                }
                break
            }
        }
    } catch (error) {
        console.error(error)
        interaction.editReply('There was an error with the command! Please try again.')
    }
}