public enum MessageSendStatus
{
    UnSend = 0,
    Success = 1,
    Failure = 2,
    /// <summary>
    /// 等待发生
    /// </summary>
    WaitingSend = 3
}

public class MailStatusModel
{
    public string MailQueueIDs { get; set; }
    public MessageSendStatus Status { get; set; }
}