using System;

namespace Ioliz.Shared.Pagination
{
   
    public class BaseQuery : PageMeta
    {
        public BaseQuery(){
            StartDate = DateTime.MinValue;
            EndDate = DateTime.MaxValue;
        }
        
        public string Keyword { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }
}