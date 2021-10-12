
export interface jsonSysSetting {
    /**终端启动时间(9:00) */
    bootTime: string;
    /**关机时间(20:00) */
    downTime: string;
    /**控制音量0~10 */
    volumn: number;
    /**终端心跳周期(默认30秒) */
    beatHeartInterval: number;
    /**终端检查通知周期(默认2秒) */
    notifyInterval: number;
    /**同步时间周期（默认为24小时) */
    syncTimeInterval: number;
    
}