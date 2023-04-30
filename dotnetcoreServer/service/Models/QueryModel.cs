using System.Collections.Generic;
using Ioliz.Shared.Pagination;

namespace Ioliz.Service.Models
{
  public class LogQuery: UserNameQuery{
    public int? LogType {get;set;}
  }
  public class UserNameQuery : BaseQuery
  {
    public string Tenant { get; set; }
  }

  

  public class TrafficResult : TSQLPaginationResult
  {
    public string Tenant { get; set; }
    public string DeviceId { get; set; }
    public string Date { get; set; }
    public decimal Payload { get; set; }
    public string NetworkInterfaceType { get; set; }
  }

  public class StatByTenantResult : TSQLPaginationResult
  {
    public string Tenant { get; set; }
    public long Payload { get; set; }
    public long BytesReceived { get; set; }
    //剩余
    public long Left { get; set; }
    public long BytesSent { get; set; }
  }

}
