using Ioliz.Service.Controllers;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Dapper;
using System.Data;
using Microsoft.AspNetCore.Authorization;

[Route("/api/[controller]/[action]")]

public class MailController : BaseController
{

    public MailController(ServiceContext ctx, ILogger<BaseController> logger) : base(ctx, logger)
    {

    }


    [HttpPost]
     [AllowAnonymous]
    public int Update([FromBody] MailStatusModel model)
    {
        string mailQueueIDs = model.MailQueueIDs;
        int status = (int)model.Status;
        if (string.IsNullOrEmpty(mailQueueIDs)) return 0;

        string sqlText = @"
                declare @sql  varchar(8000)
				declare @status int
				declare @MailQueueIDs varchar(8000)
                set @status={0}
                set @MailQueueIDs = '{1}'
                if @MailQueueIDs = ''
                       select @MailQueueIDs = null                           
                BEGIN
				    select @SQL = 'UPDATE MailMessage SET TryCount = TryCount+1,status =  '+ CAST(@status as varchar(10)) +', sendDateTime=getdate() WHERE ID IN (' + @MailQueueIDs + ')'
				    exec  (@SQL)
                END
            
            ";
        using (IDbConnection db = MemberConnection)
        {
            return db.Execute(string.Format(sqlText, (int)status, mailQueueIDs));

        }
    }
    [AllowAnonymous]
    [HttpGet]
    public dynamic Query()
    {
        var sqlText = "select top 100 * from MailMessage where status=0 and datediff(ss, createDateTime, getdate())<=3600";


        using (IDbConnection db = MemberConnection)
        {
            var result = db.Query(sqlText);
            return result;
        }
    }
}