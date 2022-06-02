using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Member.CustomTokenProvider;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Member.Models
{
    public class IolizContext : IdentityDbContext
    {
        // public DbSet<TenantAccount> Users { get; set; }
        public DbSet<TenantAccount> TenantAccounts { get; set; }
        public DbSet<ApiAuthSession> ApiAuthSessions { get; set; }
        public IolizContext(DbContextOptions<IolizContext> options) : base(options) { }
        public DbSet<Server> Servers { get; set; }
        public DbSet<MailMessage> MailMessage {get;set;}
        public IolizContext()
        {
        }

        protected override void OnConfiguring(DbContextOptionsBuilder builder)
        {
            //builder.UseSqlServer(@"");
        }
    }

    public class Server
    {
        public int Id { get; set; }
        public string ServerName { get; set; }
        public string EnServerName { get; set; }
        //内容发布系统服务器域名
        public string Domain { get; set; }
        //内容发布新系统API接口域名
        public string APIDomain { get; set; }
        public int IP { get; set; }
        public DateTime? CreateDate { get; set; }
        //服务器状态 1. 正常， 2.离线
        public int? Status { get; set; }
        public DateTime? LastUpdateTime { get; set; }
        public bool Actived { get; set; }
        //是否是试用服务器
        public bool IsTrial { get; set; }
    }

    public class ApiAuthSession
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public string SessionId { get; set; }
        public string Token { get; set; }
        public DateTime? CreateDate { get; set; }
        public DateTime? ExecuteDate { get; set; }
        public bool IsValid { get; set; }
    }

    public class TenantAccount
    {
        public int Id { get; set; }
        public string Roles { get; set; }
        public ICollection<ApplicationUser> Users { get; set; }
    }

    public class MailMessage
    {
        public int Id { get; set; }
        public string EmailAddress { get; set; }
        public string Title { get; set; }
        public DateTime? CreateDateTime { get; set; }
        public int Status { get; set; }
        public string TemplateId { get; set; }
        public string Parameter1 { get; set; }
        public string Parameter2 { get; set; }
        public string Parameter3 { get; set; }
        public string Parameter4 { get; set; }
    }
}