 //t-sql 分页接口
 namespace Ioliz.Service.Models
{
    public interface ITSQLPaginationResult
    {
        int RowNum { get; set; }
    }
    public class TSQLPaginationResult : ITSQLPaginationResult
    {
        public int RowNum { get; set; }
    }
}