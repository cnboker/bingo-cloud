namespace Ioliz.Shared.Pagination
{
    public class PageMeta
    {
        public PageMeta(){
            Page = 0;
            PageSize = 30;
        }
        public int? Page { get; set; }
        public int? PageSize { get; set; }
    }
}