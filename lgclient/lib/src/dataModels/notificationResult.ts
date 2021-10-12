import GeneralResult from './generalResult';

export default interface NotificationResult extends GeneralResult{
    /**通知内容ID */
    contentId: number;

    /**通知ID */
    nofityId: number;

    /**
     * 消息类型: 1.频道新消息, 2.紧急广播， 3.远程监控;
     * 如果是远程监控消息，调用/api/snapshot 上传截图，调用/api/Myinformation上传终端信息
     */
    messageType: number;
}