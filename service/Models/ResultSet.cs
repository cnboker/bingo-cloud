using System.Collections.Generic;

namespace Ioliz.Service.Models
{

  public class LinqResultSet<T>{
    public int PageCount {get;set;}
    public int RowNums {get;set;}
    public IList<T> Records {get;set;}
  }

  public class ResultSet<T> where T : ITSQLPaginationResult
  {
    public int PageCount { get; set; }
    public IList<T> Records { get; set; }
    
    static public ResultSet<T> ToResultSet(IList<T> data, int pageSize = 30)
    {

      return new ResultSet<T>
      {
        Records = data,
        PageCount = data.Count > 0 ? data[0].RowNum / pageSize + (data[0].RowNum % pageSize > 0 ? 1 : 0) : 0
      };
    }

  }

}