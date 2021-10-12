import { ContentType } from "../constants/contentType";

// Generated by https://quicktype.io
//
// To change quicktype's target language, run command:
//
//   "Set quicktype target language"

export interface ContentPackage {
    channelId: number;
    server: string;
    name: string;
    version: string;
    publishDate: string;
    downloadDays: number;
    channel: Channel;
}

export interface Channel {
    name: string;
    shim: null;
    playlist: Playlist[];
}

export interface Playlist {
    playlistId: number;
    name: string;
    startTime: string;
    programs: Program[];
    calender: string[];
}

export interface Program {
    location: string;
    programid: number;
    name: string;
    playTime: string;
    endTime: string;
    Duration: number;
    PlayCount: number;
    displayTime: boolean;
    backgroundType: number;
    backgroundContent: string;
    backgroundAudio: string;
    mute: boolean;
    isTile: boolean;
    eventTrigger?: boolean;
    regions: Region[];
}

export interface Region {
    position: Position;
    zIndex: number;
    lastUpdateDateTime: string;
    content: JsonContent;
}

export interface JsonContent {
    contentType: ContentType;
}

export interface FileInfo{
    name:string,
    type:string,
    size:number,
    totalCount:number
}

export interface Style {
    fontSize: string;
    textDecoration: string;
    color: string;
    fontWeight: string;
    fontFamily: string;
    x: number;
    y: number;
    text_align: string;
    backgroundColor: string;
    backgroundImage: null;
    rollStyle: number;
    direction: number;
    fontSpeed: number;
    switchTime: number;
    backgroundType: number;
}

export interface Position {
    left: number;
    top: number;
    width: number;
    height: number;
}


export interface JsonImage extends JsonContent {
    switchEffect: number;
    duration: number;
    isTile: boolean;
    interval: number;
    images: string[];
}


export interface JsonMedia extends JsonContent {
    isTile: boolean;
    mediaUrls: string[];
}

export interface JsonClock extends JsonContent {
    name: string;
    backgroundType: number;
    backgroundContent: string;
    currentDateTime: boolean;
    displayDate: boolean;
    displayTime: boolean;
    style: number;
    /**倒计时日期, 默认为"" */
    countDownDate: string;
}

export interface JsonTextStyle {
    /**///  */
    fontSize: string;
    textDecoration: string;
    color: string;
    fontWeight: string;
    fontFamily: string;
    x: number;
    y: number;
    text_align: string;
    backgroundColor: string;
    backgroundImage: string;
    rollStyle: number;
    direction: number;
    fontSpeed: number;
    switchTime: number;
    backgroundType: number;
}

export interface jsonText extends JsonContent {
    text: string[];
    duration: number;
    style: JsonTextStyle;
}

export interface JsonWeather extends JsonContent {
    name: string;
    style: number;
    refresh: number;
    /**地区代码， 终端不用考虑该属性 */
    areaCode: string;
    province: string;
    city: string;
    backgroundType: number;
    backgroundContent: string;
}

export interface JsonWebPage extends JsonContent {
    url: string;
    snapshotUrl: string;
    duration: number;
}