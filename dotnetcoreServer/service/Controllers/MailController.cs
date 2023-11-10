using Ioliz.Service.Controllers;
using Ioliz.Service.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Dapper;
using System.Data;
using Microsoft.AspNetCore.Authorization;

namespace Ioliz.Service.Controllers;
[Route("/api/[controller]/[action]")]
public class MailController : BaseController
{

    public MailController(ServiceContext ctx, ILogger<BaseController> logger) : base(ctx, logger)
    {

    }


    [AllowAnonymous]
    [HttpPost("/api/mail/update")]
    public int Update([FromBody] MailStatusModel model)
    {
        string mailQueueIDs = model.MailQueueIDs;
        int status = (int)model.Status;
        if (string.IsNullOrEmpty(mailQueueIDs)) return 0;

        string sqlText = @"
            set @status={0};
            set @MailQueueIDs = '{1}';
            set @SQL = 'UPDATE MailMessage SET status =  ? WHERE id IN (?);';
            PREPARE myquery FROM @SQL;
            EXECUTE myquery using @status,@MailQueueIDs
            ";
        using (IDbConnection db = MemberConnection)
        {
            return db.Execute(string.Format(sqlText, (int)status, mailQueueIDs));

        }
    }
    [AllowAnonymous]
    [HttpGet("/api/mail/Query")]
    public dynamic Query()
    {
        var sqlText = "select * from MailMessage where status=0 and TIME_TO_SEC(TIMEDIFF(createDateTime, now()))<=3600 limit 100";


        using (IDbConnection db = MemberConnection)
        {
            var result = db.Query(sqlText);
            return result;
        }
    }
}