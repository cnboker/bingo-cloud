using System;
using System.Data;
using System.Data.Common;
using Microsoft.Extensions.Configuration;
using Dapper;

namespace Member.Repositories
{
    public enum MailTemplate{
      EmailConfirm,
      ResetPassword,
    }
    
    public class MailRepository : RepositoryBase
    {
        public MailRepository(IConfiguration configuration) : base(configuration)
        {
        }

        public void Send(string fromMail, string title, string templateId, string p1 = "", string p2 = "", string p3 = "", string p4 = "")
        {
            using (IDbConnection db = MemberConnection)
            {
                string sqlText = @"insert into MailMessage
          (EmailAddress,title, Status,TemplateId,Parameter1,Parameter2,Parameter3,Parameter4)
          values (@EmailAddress,@title,0,@TemplateId,@Parameter1,@Parameter2,@Parameter3,@Parameter4)
          ";
                db.Execute(sqlText, new
                {
                    EmailAddress = fromMail,
                    Title = title,
                    TemplateId = templateId,
                    Parameter1 = p1,
                    Parameter2 = p2,
                    Parameter3 = p3,
                    Parameter4 = p4,
                });
            }
        }
    }
}