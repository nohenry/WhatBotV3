import { SlashCommandBuilder } from '@discordjs/builders'
import { REST } from '@discordjs/rest'
import { createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, joinVoiceChannel } from '@discordjs/voice'
import { Routes } from 'discord-api-types/v9'
import { Awaitable, Client, CommandInteraction, Intents } from 'discord.js'
import fs from 'fs'
import path from 'path'
// import config from './config.json'
import { initialize_player } from './music'

const config = {
        token: 'NzA4MDQ5NzY4NzU2MjgxNDM1.XrRsuw.Ysbxnimqhx3dl0d3hFewyPMfOyA'
}

const rest = new REST({ version: '9' }).setToken(config.token)

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES], })

const commands: { command: SlashCommandBuilder, onExecute: (options: CommandInteraction) => Awaitable<void> }[] = []
const command_path = path.join(__dirname, 'commands')
const sounds: { files: string[], name: string }[] = []
const sounds_path = path.join(__dirname, '..', 'sounds')

const ready_promises: Promise<void>[] = []

ready_promises.push(new Promise((resolve, reject) => {
    fs.readdir(command_path, async (err, files) => {
        if (err) return reject(err)

        const command_files = files.filter(file => file.endsWith('.ts'))

        for (const file of command_files) {
            const module = await import(path.join(command_path, file))
            commands.push(module)
        }

        resolve()
    })
}))

ready_promises.push(new Promise((resolve, reject) => {
    fs.readdir(sounds_path, async (err, files) => {
        if (err) return reject(err)

        files
            .filter(file => file.endsWith('.mp3'))
            .forEach(file => {
                const name = (/([a-zA-Z\-_]+)/gm).exec(file)![0].toLocaleLowerCase()
                const sound = sounds.find(s => s.name === name) ?? (sounds.push({ name, files: [] }) > 0 ? sounds[sounds.length - 1] : sounds[sounds.length - 1])

                sound.files.push(file)
            })

        console.log(sounds)

        resolve()
    })
}))

client.on('ready', async () => {
    console.log('Bot Ready')

    initialize_player(client)

    try {
        console.log('Started refreshing application (/) commands.')

        await rest.put(
            Routes.applicationCommands(client.user!.id),
            { body: commands.map(v => v.command) },
        )

        await rest.put(
            Routes.applicationGuildCommands(client.user!.id, '705288984800133141'),
            { body: commands.map(v => v.command) }
        )

        console.log('Successfully reloaded application (/) commands.')
    } catch (error) {
        console.error(error)
        console.dir(error)
    }
})

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand())
        return commands.find(v => v.command.name === interaction.commandName)?.onExecute(interaction)
})

client.on('messageCreate', message => {
    const voice_channel = message.member?.voice.channel
    const sound = sounds.find(s => s.name == message.content.toLocaleLowerCase())
    console.log('Playing', sound)

    if (voice_channel && sound && message.guildId && message.guild?.voiceAdapterCreator) {
        const connection = joinVoiceChannel({
            adapterCreator: message.guild?.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
            channelId: message.member.voice.channel.id,
            guildId: message.guildId,
            selfDeaf: false
        })
        const index = Math.floor(Math.random() * sound.files.length)
        const file = sound.files[index]
        console.log('file', file)

        const audio_resource = createAudioResource(path.join(sounds_path, file), { inlineVolume: true })

        audio_resource.volume!.setVolume(0.3)
        const player = createAudioPlayer()
        connection.subscribe(player)
        player.play(audio_resource)
        console.log('adui', audio_resource)
    }
})

Promise.all(ready_promises).then(client.login.bind(client, config.token))
