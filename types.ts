
export interface VideoInfo {
    id: string;
    title: string;
    url: string;
}

export interface VideoTranscript extends VideoInfo {
    transcript: string;
}

export enum Language {
    Spanish = 'es',
    English = 'en',
    Portuguese = 'pt',
}