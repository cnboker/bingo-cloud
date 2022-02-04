using System;
using System.Collections.Generic;
using System.Linq;
using Ioliz.Shared.Pagination;

namespace Ioliz.Service.Models
{
  public class WarningMessageQuery:PageMeta{
    public int? Part {get;set;}
    public string SensorId {get;set;}
  }


  public class WarningMessage : ITSQLPaginationResult
  {
    public int RowNum { get;set; }
    public string SensorId {get;set;}
    public int Part {get;set;}
    public string Remark {get;set;}
    public int Status {get;set;}
    public DateTime? CreateDate {get;set;}
    public DateTime? UpdateDate {get;set;}
    public string Value {get;set;}
  }

  public class SensorMessage : ITSQLPaginationResult
  {
    public string SensorId {get;set;}
    public string GroupName {get;set;}
    public string Factory {get;set;}
    public string Model {get;set;}
    public string UserName {get;set;}
    public DateTime CreateDate {get;set;}
    public DateTime UpdateTime {get;set;}
     
    public string Message {get;set;}
    public string SIM {get;set;}
    public string Name {get;set;}
    public int RowNum { get;set;}
  }
}