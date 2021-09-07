using Ioliz.Service.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using System;
using Microsoft.AspNetCore.Hosting;
using System.Data;
using Dapper;
using Member.Repositories;

namespace Ioliz.Service.Controllers
{
    [Authorize]
    [Route("/api/[controller]/[action]")]
    public class Sensor2Controller : BaseController
    {
        private IWebHostEnvironment _hostingEnvironment;
        public Sensor2Controller(ServiceContext context, ILogger<Sensor2Controller> logger, IWebHostEnvironment hostingEnvironment
       ) : base(context, logger)
        {
            this._hostingEnvironment = hostingEnvironment;
        }
        //首页接口
        [AllowAnonymous]
        [HttpGet("/api/sensor2/index")]
        public IActionResult Index()
        {
            HomeRepository rep = new HomeRepository();
            var powerStats = rep.GetPowerStats(User.Identity.Name);
            var deviceStats = rep.GetDeviceStatsModel(User.Identity.Name);
            var workTimeModel = rep.GetWorkTime(User.Identity.Name);
            var exceptionStats = rep.GetExceptionHandlerStats(User.Identity.Name);
            var model = new IndexModel
            {
                PowerStats = powerStats,
                DeviceStats = deviceStats,
                workTimeStats = workTimeModel,
                ExceptionHandlerStats = exceptionStats
            };
            return Json(model);
        }

        //获取环控设备列表
        //告警设备不包含报修中的设备
        [HttpGet("/api/sensor2/scopes")]
        public IActionResult Scopes()
        {
            var column = "userName";
            if (IsAgent())
            {
                column = "factory";
            }
            var sqlText = string.Format(@"
              select *,
              (select message from [mqttBroker].[dbo].[tbl_messages] where topic = 'SENSORS/' + sensorId) as message
              FROM SensorScopeModelView where {0} =@userName and model is not null", column);

            using (IDbConnection db = MemberConnection)
            {
                var result = db.Query(sqlText, new { userName = User.Identity.Name });

                return Json(result.ToArray());
            }

        }

        //异常，正常的设备都显示，正在报修中的不用显示（对应报修处理缺省页)
        [HttpGet("/api/sensor2/unApplyScopes")]
        public IActionResult UnapplyScopes()
        {
            var column = "userName";
            if (IsAgent())
            {
                column = "factory";
            }
            var sqlText = string.Format(@"
              select *,
              (select message from [mqttBroker].[dbo].[tbl_messages] where topic = 'SENSORS/' + sensorId) as message
              FROM SensorScopeModelView where {0} =@userName and model is not null and (state <> 2 or state is null)", column);

            using (IDbConnection db = MemberConnection)
            {
                var result = db.Query(sqlText, new { userName = User.Identity.Name });

                return Json(result.ToArray());
            }

        }


        [HttpDelete("/api/sensor2/sensorModelDelete/{sensorId}")]
        public IActionResult SensorModelDelete(string sensorId)
        {
            var obj = ctx.SensorModels.FirstOrDefault(c => c.SensorId == sensorId);
            if (obj != null)
            {
                ctx.SensorModels.Remove(obj);
            }
            ctx.SaveChanges();
            var list = ctx.SensorModels.AsQueryable().Where(c => c.UserName == User.Identity.Name).ToArray();
            return Ok(list);
        }

        [HttpPost("/api/Sensor2/sensorModelPost")]
        public IActionResult SensorModelPost([FromBody] SensorModel model)
        {
            var obj = ctx.SensorModels.FirstOrDefault(c => c.DeviceId == model.DeviceId);
            if (obj == null)
            {
                obj = new SensorModel()
                {
                   
                };
                ctx.SensorModels.Add(obj);
            }
            obj.UserName = User.Identity.Name;
            obj.DeviceId = model.DeviceId;
            obj.SensorId = model.SensorId;         
            obj.Name = model.Name;
            obj.Model = model.Model;
            ctx.SaveChanges();
            var list = ctx.SensorModels.AsQueryable().Where(c => c.UserName == User.Identity.Name).ToArray();
            return Ok(list);
        }

        // [HttpPost("/api/sensor2/groupUpdate")]
        // public IActionResult GroupUpdate([FromBody] SensorUpdateModel model)
        // {
        //     var ids = model.SensorId.Split(",".ToCharArray());
        //     ctx.SensorScopes.AsQueryable().Where(x => ids.Contains(x.SensorId)).ToList().ForEach(x =>
        //     {
        //         x.Group = model.GroupName;
        //     });
        //     ctx.SaveChanges();
        //     return Ok();
        // }

        [HttpPost("/api/sensor2/updateName")]
        public IActionResult UpdateName([FromBody] SensorUpdateModel model)
        {
            var device = ctx.SensorModels.FirstOrDefault(x => x.SensorId == model.SensorId);
            if (device == null) return NotFound("sensor not found");
            // if (device.Factory != User.Identity.Name && device.UserName != User.Identity.Name) new UnauthorizedAccessException();
            if (!string.IsNullOrEmpty(model.Name))
            {
                device.Name = model.Name;
            }
            ctx.SaveChanges();
            return Ok();
        }


        [HttpGet("/api/sensor2/faultApplyList")]
        public IActionResult ApplyList([FromQuery] string keyword, [FromQuery] int? page, [FromQuery] string status)
        {
            return Json(_ApplyList<RepairApply>(keyword, page, status));
        }

        public LinqResultSet<SensorFaultApplyView> _ApplyList<T>([FromQuery] string keyword, [FromQuery] int? page, [FromQuery] string status)
        {
            var isfactory = IsAgent();

            var db = ctx.SensorFaultApplyViews.AsQueryable();
            if (isfactory)
            {
                db = db.Where(c => c.Accepter == User.Identity.Name && c.HandleMethod == HandleMethodEnum.ServiceFixed);
            }
            else
            {
                db = db.Where(c => c.Applyer == User.Identity.Name);
            }
            if (!string.IsNullOrEmpty(keyword))
            {
                db = db.Where(c => c.Name.Contains(keyword) || c.SensorId.Contains(keyword));
            }

            if (!string.IsNullOrEmpty(status))
            {
                HandleStepEnum step = (HandleStepEnum)Enum.Parse(typeof(HandleStepEnum), status, true);
                if (step == HandleStepEnum.InComplete)
                {
                    db = db.Where(c => c.ApplyState != HandleStepEnum.UserAccepted);
                }
            }

            var rowNums = db.Count();
            var data = db.OrderByDescending(c => c.ApplyState).Skip(page ?? 0 * PageSize).Take(PageSize).ToList();
            return new LinqResultSet<SensorFaultApplyView>
            {
                PageCount = rowNums / PageSize + rowNums % PageSize > 0 ? 1 : 0,
                RowNums = rowNums,
                Records = data
            };
        }


        // [HttpPut("/api/sensor2/applyUpdate/{id}")]
        // public async Task<IActionResult> ApplyUpdate(int id,[FromBody] RepairApply model){
        //     //工单转换为自行处理
        //     var apply = ctx.RepairApplies.FirstOrDefault(c=>c.Id == id);
        //     if(apply == null){
        //         return BadRequest("Instance not found!");
        //     }
        //     //工单转换为自行处理业务
        //     if(model.HandleMethod.HasValue){
        //         apply.HandleMethod = model.HandleMethod;
        //     }
        //     await ctx.SaveChangesAsync();
        //     return Ok(apply);
        // }

        //报修申请    
        [HttpPost("/api/sensor2/applyPost")]
        public async Task<IActionResult> Apply([FromBody] RepairApply apply)
        {
            if (ctx.RepairApplies.Any(c => c.SensorId == apply.SensorId &&
            c.ApplyState == HandleStepEnum.Pending &&
            c.HandleMethod == HandleMethodEnum.ServiceFixed
            ))
            {
                return BadRequest("您提交的维修申请还未处理，请不要重复提交.");
            }

            var factory = GetAgent();
            apply.Applyer = User.Identity.Name;
            apply.Accepter = factory;
            apply.ApplyDate = DateTime.Now;
            apply.ApplyState = apply.HandleMethod == HandleMethodEnum.ServiceFixed? HandleStepEnum.Pending : HandleStepEnum.Handled;
            ctx.RepairApplies.Add(apply);

            //
            var scope = ctx.SensorScopes.FirstOrDefault(c => c.SensorId == apply.SensorId);
            if (scope != null)
            {
                scope.State = DeviceStateEnum.Handling;
                scope.HandleMethod = apply.HandleMethod;
                scope.HandleStep = HandleStepEnum.Pending;
                scope.ApplyTime = DateTime.Now;
            }

            await ctx.SaveChangesAsync();

            //添加短信通知
            var userSetting = GetSetting(factory);
            Console.WriteLine("facotry:userSetting.Mobile2:" + userSetting.Mobile2 + ",factory" + factory);
            if (!string.IsNullOrEmpty(userSetting.Mobile2))
            {
                var sqlText = @"
                insert into smsMessage
                (mobile,[content],messageType,CreateDatetime,Status,TryCount)
                values
                (@mobile,@content,1,getdate(),0,0)
            ";
                using (IDbConnection db = MemberConnection)
                {
                    var result = db.Execute(sqlText, new
                    {
                        //工厂接收短信号
                        mobile = userSetting.Mobile2,
                        content = string.Format("客户{0}的环控设备异常申请已提交,请注意查阅!",User.Identity.Name)
                    });
                }
            }

            ctx.RepairApplies.Attach(apply);
            return Ok(GetApply(apply.Id));
        }

        private dynamic GetApply(int id)
        {
            return ctx.SensorFaultApplyViews.FirstOrDefault(c => c.Id == id);
        }

        [HttpPost("/api/sensor2/userSelfFixed/{sensorId}")]
        public async Task<IActionResult> UserSelfFixed(string sensorId)
        {
            if (ctx.RepairApplies.AsQueryable().Where(c => c.SensorId == sensorId &&
            c.ApplyState == HandleStepEnum.Accepted).Any())
            {
                return BadRequest("已设置为自行处理，请不要重复设定");
            }
            var apply = new RepairApply()
            {
                Applyer = User.Identity.Name,
                ApplyDate = DateTime.Now,
                SensorId = sensorId,
                Accepter = User.Identity.Name,
                AcceptDate = DateTime.Now,
                ApplyState = HandleStepEnum.Accepted,
                HandleMethod = HandleMethodEnum.SelfFixed,
                Title = "自行处理",
                DeSc = "自行处理"
            };
            try
            {
                ctx.RepairApplies.Add(apply);
                await ctx.SaveChangesAsync();

            }
            catch (DbUpdateConcurrencyException)
            {
                throw;
            }
            return Ok(GetApply(apply.Id));
        }

        //自行处理
        [HttpPut("/api/sensor2/userSelfFixed/{id}")]
        public async Task<IActionResult> UserSelfFixed(int id)
        {
            var apply = ctx.RepairApplies.AsQueryable().Where(c => c.Id == id).FirstOrDefault();
            if (apply.Applyer != User.Identity.Name)
            {
                return BadRequest("unAuthenticated");
            }
            try
            {
                apply.HandleMethod = HandleMethodEnum.SelfFixed;
                await ctx.SaveChangesAsync();

            }
            catch (DbUpdateConcurrencyException)
            {
                throw;
            }
            return Ok(GetApply(apply.Id));
        }

        //工厂受理
        [HttpPut("/api/sensor2/factoryAccepted/{id}")]
        public async Task<IActionResult> FactoryAccepted(int id)
        {

            if (!this.IsAgent())
            {
                return BadRequest("unAuthenticated");
            }
            var apply = ctx.RepairApplies.AsQueryable().Where(c => c.Id == id).FirstOrDefault();
            if (apply.Accepter != User.Identity.Name)
            {
                return BadRequest("unAuthenticated");
            }
            var scope = ctx.SensorScopes.FirstOrDefault(c => c.SensorId == apply.SensorId);
            try
            {
                apply.AcceptDate = DateTime.Now;
                apply.ApplyState = HandleStepEnum.Accepted;
                if (scope != null)
                {
                    scope.HandleStep = HandleStepEnum.Accepted;
                }
                await ctx.SaveChangesAsync();

            }
            catch (DbUpdateConcurrencyException)
            {
                throw;
            }
            return Ok(GetApply(apply.Id));
        }

        [HttpPut("/api/sensor2/facotryHandled/{id}")]
        public async Task<IActionResult> FactoryHandled(int id)
        {

            var apply = ctx.RepairApplies.AsQueryable().Where(c => c.Id == id).FirstOrDefault();
            if (apply.Accepter != User.Identity.Name)
            {
                return BadRequest("unauthenticated");
            }
            var scope = ctx.SensorScopes.FirstOrDefault(c => c.SensorId == apply.SensorId);
            try
            {
                apply.FactoryFinisheddDate = DateTime.Now;
                apply.ApplyState = HandleStepEnum.Handled;
                if (scope != null)
                {
                    scope.HandleStep = HandleStepEnum.Handled;
                }
                await ctx.SaveChangesAsync();

                 var userSetting = GetSetting(apply.Applyer);
                 Console.WriteLine("user:userSetting.Mobile2:" + userSetting.Mobile2 + ",apply.Applyer=" + apply.Applyer);
                if (!string.IsNullOrEmpty(userSetting.Mobile2))
                {
                    var sqlText = @"
                    insert into smsMessage
                    (mobile,[content],messageType,CreateDatetime,Status,TryCount)
                    values
                    (@mobile,@content,1,getdate(),0,0)
                ";
                    using (IDbConnection db = MemberConnection)
                    {
                        var result = db.Execute(sqlText, new
                        {
                            //工厂接收短信号
                            mobile = userSetting.Mobile2,
                            content = string.Format("您提交的环控维修申请已处理,请注意查阅并尽快确认!")
                        });
                    }
                }

            }
            catch (DbUpdateConcurrencyException)
            {
                throw;
            }
            return Ok(GetApply(apply.Id));
        }

        [HttpPut("/api/sensor2/userAccepted/{id}")]
        public async Task<IActionResult> CustomerAccepted(int id)
        {
            var apply = ctx.RepairApplies.AsQueryable().Where(c => c.Id == id).FirstOrDefault();

            if (apply.Applyer != User.Identity.Name)
            {
                return BadRequest("unauthenticated");
            }
            var scope = ctx.SensorScopes.FirstOrDefault(c => c.SensorId == apply.SensorId);
            try
            {
                apply.FinishedDate = DateTime.Now;
                apply.ApplyState = HandleStepEnum.UserAccepted;
                if (scope != null)
                {
                    scope.HandleStep = HandleStepEnum.UserAccepted;
                    scope.State = DeviceStateEnum.Normal;
                }
                await ctx.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                throw;
            }
            return Ok(GetApply(apply.Id));
        }


        [HttpPost("/api/sensor2/applyRemender/{id}")]
        public async Task<IActionResult> ApplyRemender(int id)
        {
            var apply = await ctx.RepairApplies.FindAsync(id);
            if (apply == null)
            {
                return NotFound();
            }

            if (apply.Applyer != User.Identity.Name)
            {
                return BadRequest("Please verify that you have permissions");
            }
            if (apply.LastRemenderTime.HasValue)
            {
                var hours = DateTime.Now.Subtract(apply.LastRemenderTime.Value).TotalHours;
                if (hours < 24)
                {
                    return BadRequest("已经帮您催单,请不要频繁催单!");
                }
            }
            apply.RemenderCount += 1;
            apply.LastRemenderTime = DateTime.Now;
            await ctx.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("/api/sensor2/applyDelete/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var apply = await ctx.RepairApplies.FindAsync(id);
            if (apply == null)
            {
                return NotFound();
            }

            if (apply.Applyer != User.Identity.Name)
            {
                return BadRequest("Please verify that you have permissions");
            }

            ctx.RepairApplies.Remove(apply);
            await ctx.SaveChangesAsync();

            return NoContent();
        }

    }
}