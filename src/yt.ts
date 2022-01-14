import { stringify } from 'querystring'
import axios from 'axios'

export interface YouTubeOptions {
    maxResults?: number
    pageToken?: string
    part?: string
    regionCode?: string
    videoCategoryId?: string
    key?: string
}

export type YouTubeSearchOptions = {
    fields?: string
    channelId?: string
    channelType?: string
    eventType?: string
    forContentOwner?: boolean
    forDeveloper?: boolean
    forMine?: boolean
    location?: string
    locationRadius?: string
    onBehalfOfContentOwner?: string
    order?: string
    publishedAfter?: string
    publishedBefore?: string
    relatedToVideoId?: string
    relevanceLanguage?: string
    safeSearch?: string
    topicId?: string
    type?: string
    videoCaption?: string
    videoDefinition?: string
    videoDimension?: string
    videoDuration?: string
    videoEmbeddable?: string
    videoLicense?: string
    videoSyndicated?: string
    videoType?: string
} & YouTubeOptions

export type YouTubeQueryOptions = {
    hl?: string
    maxWidth?: number,
    maxHeight?: number,
    chart?: string,
    myRating?: string
} & YouTubeOptions

export interface YouTubeThumbnail {
    url: string
    width: number
    height: number
}

export interface YouTubeSearchResultThumbnails {
    default?: YouTubeThumbnail
    medium?: YouTubeThumbnail
    high?: YouTubeThumbnail
    standard?: YouTubeThumbnail
    maxres?: YouTubeThumbnail
}

export interface YouTubeSearchResults {
    id: string
    link: string
    kind: string
    publishedAt: string
    channelTitle: string
    channelId: string
    title: string
    description: string
    thumbnails: YouTubeSearchResultThumbnails,
    duration: string,
    durationMs: number
}

export interface YouTubeSearchPageResults {
    totalResults: number
    resultsPerPage: number
    nextPageToken: string
    prevPageToken: string
}

const API_URL = 'https://www.googleapis.com/youtube/v3'

export const search = async (term: string, options: YouTubeSearchOptions = {}) => {
    const params = {
        q: term,
        part: options.part || 'snippet',
        maxResults: options.maxResults || 30,
        ...options
    }

    const response = await axios.get(API_URL + '/search?' + stringify(params))
    const body = response.data

    const pageInfo: YouTubeSearchPageResults = {
        totalResults: body.pageInfo.totalResults,
        resultsPerPage: body.pageInfo.resultsPerPage,
        nextPageToken: body.nextPageToken,
        prevPageToken: body.prevPageToken
    }

    const results: YouTubeSearchResults[] = body.items.map((item: any) => {
        let link = ''
        let id = ''
        switch (item.id.kind) {
            case 'youtube#channel':
                link = 'https://www.youtube.com/channel/' + item.id.channelId
                id = item.id.channelId
                break
            case 'youtube#playlist':
                link = 'https://www.youtube.com/playlist?list=' + item.id.playlistId
                id = item.id.playlistId
                break
            default:
                link = 'https://www.youtube.com/watch?v=' + item.id.videoId
                id = item.id.videoId
                break
        }


        return {
            id: id,
            link: link,
            kind: item.id.kind,
            publishedAt: item.snippet.publishedAt,
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnails: item.snippet.thumbnails
        }
    })

    return { results, pageInfo }
}

export const getFromId = async (id: string, options: YouTubeQueryOptions = {}) => {
    const params = {
        id,
        part: options.part || 'snippet',
        maxResults: options.maxResults || 30,
        ...options
    }

    const response = await axios.get(API_URL + '/videos?' + stringify(params))
    const body = response.data

    const pageInfo: YouTubeSearchPageResults = {
        totalResults: body.pageInfo.totalResults,
        resultsPerPage: body.pageInfo.resultsPerPage,
        nextPageToken: body.nextPageToken,
        prevPageToken: body.prevPageToken
    }

    const results: YouTubeSearchResults[] = body.items.map((item: any) => {
        let link = ''
        switch (item.id.kind) {
            case 'youtube#channel':
                link = 'https://www.youtube.com/channel/' + item.id
                break
            case 'youtube#playlist':
                link = 'https://www.youtube.com/playlist?list=' + item.id
                break
            default:
                link = 'https://www.youtube.com/watch?v=' + item.id
                break
        }

        let duration = ''
        let durationMs = 0
        if (item.contentDetails) {
            const exc = (/PT([0-9])+M([0-9])?S?/).exec(item.contentDetails.duration)
            if (exc) {
                duration += (exc[1] ?? '0') + ':' + (exc[2] ?? '00').padStart(2, '0')
                durationMs = parseInt(exc[1] ?? 0) * 60 * 1000 + parseInt(exc[2] ?? 0) * 1000
            }
        }

        return {
            id: item.id,
            link,
            kind: item.kind,
            publishedAt: item.snippet.publishedAt,
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnails: item.snippet.thumbnails,
            duration,
            durationMs
        }
    })

    return { results, pageInfo }
}