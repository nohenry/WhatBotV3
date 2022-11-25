import { AudioPlayer, PlayerSubscription, VoiceConnection } from '@discordjs/voice'
import { YouTubeSearchResults } from './yt'

export let queue: { songs?: YouTubeSearchResults[], connection?: VoiceConnection, player?: AudioPlayer, sub?: PlayerSubscription } = { songs: [] }