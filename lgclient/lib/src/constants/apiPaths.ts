
/**获取通知或者更新通知状态，Get时参数为终端授权key，Post时参数为NotifyID */
export const NotifyPath = `/api/notify/{0}`;
/**获取最新节目内容，参数为ContentId */
export const GetContentPath = "/api/content/{0}";
/**上传设备截图，参数为终端授权key */
export const SnapshotPath = "/api/snapshot/{0}";
export const SnapshotPath2 = "/api/BaseFormatImageSnapshot";
/**上传监控信息 */
export const MyInformationPath = "/api/Myinformation";
/**上传日志文件 */
export const LogPath = "/api/log";
/**客户端心跳，参数为终端授权key */
export const HeartbeatPath = "/api/Myinformation/{0}";
/**获取城市天气，参数为城市名称 */
export const WeatherPath = "/api/weather/{0}";
/**记录节目或播放列表的播放次数 */
export const PlayCountPath = "/api/playCount";

/**上传网络流量信息 */
export const NetTrafficInfoPath = "api/NetTraffic/Post";

