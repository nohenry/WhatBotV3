import { SlashCommandBuilder } from '@discordjs/builders'
import { RepeatMode, Song, Utils } from 'discord-music-player'
import { CommandInteraction, MessageEmbed } from 'discord.js'
import { music_player } from '../music'

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


export const onExecute = async (interaction: CommandInteraction) => {

    const guild = interaction.client.guilds.cache.get(interaction.guild!.id)!
    const member = guild.members.cache.get(interaction.member!.user.id)
    const voiceChannel = member!.voice.channel

    if (!voiceChannel) return
    const guildQueue = music_player.getQueue(guild.id)

    await interaction.deferReply()
    try {
        switch (interaction.options.getSubcommand()!) {
            case 'play': {
                const target = interaction.options.getString('target')
                if (target) {
                    const queue = music_player.createQueue(interaction.guild!.id)

                    let promse = new Promise<Song>(async (resolve, reject) => {
                        let song = await Utils.link(target, undefined, queue);
                        if (!song)
                            song = (await Utils.search(target, undefined, queue))[0];
                        resolve(song)

                        const embed = new MessageEmbed()
                            .setColor('#620043')
                            .setTitle(song.name)
                            .setImage(song.thumbnail)
                            .setAuthor({ name: song.author })
                            .setDescription(song.duration)

                        interaction.editReply({ embeds: [embed] })
                    })

                    console.log(interaction.client.voice.adapters)
                    if (interaction.client.voice.adapters.size == 0) {
                        queue.join(voiceChannel)
                    }
                    const toplay = await promse

                    const song = await queue.play(toplay).catch(e => {
                        if (!guildQueue)
                            queue.stop()
                        console.error(e)
                    }) as Song
                    console.log(song)

                } else {
                    console.log('skipped')
                    guildQueue?.setPaused(false)

                    if (guildQueue?.nowPlaying) interaction.editReply(`Paused: ${guildQueue.nowPlaying.name}`)
                    else interaction.deleteReply()
                }
                break
            }
            case 'skip': {
                const song = guildQueue?.skip()
                if (song) interaction.editReply(`Skipped: ${song.name}`)
                else interaction.editReply('No song to skip!')
                break
            }
            case 'stop': {
                guildQueue?.stop()
                interaction.editReply('Stopped queue')
                break
            }
            case 'pause': {
                guildQueue?.setPaused(true)
                if (guildQueue?.nowPlaying) interaction.editReply(`Paused: ${guildQueue.nowPlaying.name}`)
                else interaction.deleteReply()
                break
            }
            case 'loop': {
                if (interaction.options.getBoolean('queue')) guildQueue?.setRepeatMode(RepeatMode.QUEUE)
                else guildQueue?.setRepeatMode(RepeatMode.SONG)
                interaction.deleteReply()
                break
            }
            case 'noloop': {
                guildQueue?.setRepeatMode(RepeatMode.DISABLED)
                break
            }
            case 'clear': {
                guildQueue?.clearQueue()
                break
            }
            case 'current': {
                const playing = guildQueue?.nowPlaying
                if (playing) {
                    const embed = new MessageEmbed()
                        .setColor('#620043')
                        .setTitle(playing.name)
                        .setImage(playing.thumbnail)
                        .setAuthor({ name: playing.author })
                        .setDescription(playing.duration)

                    interaction.editReply({ embeds: [embed] })
                } else {
                    interaction.editReply('No song currently playing!')
                }
                break
            }
            case 'seek': {
                const time = interaction.options.getString('time')!
                const spt = time.split(':')
                const minute = parseInt(spt[0])
                const second = parseInt(spt[1])
                const sum = (minute * 60 + second) * 1000
                guildQueue?.seek(sum)
                interaction.editReply(`Seeked to: ${minute}:${second}`)
                break
            }
            case 'progress': {
                const playing = guildQueue?.nowPlaying
                if (playing) {
                    const progress = guildQueue.createProgressBar({ size: 30 })
                    const pstr = progress.prettier.replace(/ /g, ' ')
                    const embed = new MessageEmbed()
                        .setColor('#620043')
                        .setTitle(playing.name)
                        .setAuthor({ name: playing.author })
                        .setFields({ name: 'progress', value: pstr })
                    console.log(progress, progress.toString(), progress.prettier, progress)

                    interaction.editReply({ embeds: [embed] })
                } else {
                    interaction.deleteReply()
                }
                break
            }
        }
    }
    catch (e) {
        console.error(e)
        interaction.editReply('Error in command! Please try again.')
    }
}