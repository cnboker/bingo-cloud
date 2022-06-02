using System;

namespace Member.Models{
  public class QRResult{
    //授权码
    public string AuthorizeCode {get;set;}
    public string QRUrl {get;set;}
  }

   public class TokenResult 
    {
        public string session_id { get; set; }
        public string access_token { get; set; }
    }
}