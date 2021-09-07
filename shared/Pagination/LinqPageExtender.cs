using Ioliz.Shared.Pagination;

namespace System.Linq
{

    public static class LinqPageExtender
    {
        public const int PAGE_SIZE = 15;
        public static dynamic Pagination<T>(this IQueryable<T> source, PageMeta meta)
        {
            int pageNum = meta.Page ?? 0;
            int pageSize = meta.PageSize.HasValue ? meta.PageSize.Value : PAGE_SIZE;
            int count = source.Count();
            
            return new
            {
                Data = source.Skip(pageNum * pageSize).Take(pageSize).ToArray(),
                PageCount = Convert.ToInt32(count / pageSize) + ((count % pageSize) > 0 ? 1 : 0)
            };
        }
    }
}