"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFromId = exports.search = void 0;
const querystring_1 = require("querystring");
const axios_1 = __importDefault(require("axios"));
const API_URL = 'https://www.googleapis.com/youtube/v3';
const search = async (term, options = {}) => {
    const params = {
        q: term,
        part: options.part || 'snippet',
        maxResults: options.maxResults || 30,
        ...options
    };
    const response = await axios_1.default.get(API_URL + '/search?' + (0, querystring_1.stringify)(params));
    const body = response.data;
    const pageInfo = {
        totalResults: body.pageInfo.totalResults,
        resultsPerPage: body.pageInfo.resultsPerPage,
        nextPageToken: body.nextPageToken,
        prevPageToken: body.prevPageToken
    };
    const results = body.items.map((item) => {
        let link = '';
        let id = '';
        switch (item.id.kind) {
            case 'youtube#channel':
                link = 'https://www.youtube.com/channel/' + item.id.channelId;
                id = item.id.channelId;
                break;
            case 'youtube#playlist':
                link = 'https://www.youtube.com/playlist?list=' + item.id.playlistId;
                id = item.id.playlistId;
                break;
            default:
                link = 'https://www.youtube.com/watch?v=' + item.id.videoId;
                id = item.id.videoId;
                break;
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
        };
    });
    return { results, pageInfo };
};
exports.search = search;
const getFromId = async (id, options = {}) => {
    const params = {
        id,
        part: options.part || 'snippet',
        maxResults: options.maxResults || 30,
        ...options
    };
    const response = await axios_1.default.get(API_URL + '/videos?' + (0, querystring_1.stringify)(params));
    const body = response.data;
    const pageInfo = {
        totalResults: body.pageInfo.totalResults,
        resultsPerPage: body.pageInfo.resultsPerPage,
        nextPageToken: body.nextPageToken,
        prevPageToken: body.prevPageToken
    };
    const results = body.items.map((item) => {
        let link = '';
        switch (item.id.kind) {
            case 'youtube#channel':
                link = 'https://www.youtube.com/channel/' + item.id;
                break;
            case 'youtube#playlist':
                link = 'https://www.youtube.com/playlist?list=' + item.id;
                break;
            default:
                link = 'https://www.youtube.com/watch?v=' + item.id;
                break;
        }
        let duration = '';
        let durationMs = 0;
        if (item.contentDetails) {
            const exc = (/PT([0-9])+M([0-9])?S?/).exec(item.contentDetails.duration);
            if (exc) {
                duration += (exc[1] ?? '0') + ':' + (exc[2] ?? '00').padStart(2, '0');
                durationMs = parseInt(exc[1] ?? 0) * 60 * 1000 + parseInt(exc[2] ?? 0) * 1000;
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
        };
    });
    return { results, pageInfo };
};
exports.getFromId = getFromId;
//# sourceMappingURL=yt.js.map