import { Player } from 'discord-music-player'
import { Client } from 'discord.js'

export let music_player: Player

export const initialize_player = (client: Client) => {
    music_player = new Player(client)
}