using Dapper;
using System.Data;
using Ioliz.Service.Models;
using System.Collections.Generic;
using System.Linq;
using MySql.Data.MySqlClient;
using Microsoft.Extensions.Localization;
using System;
using Ioliz.Service.Repositories;
using Ioliz.Service;

public class InstanceRepository : RepositoryBase
{
    ServiceContext ctx;
    //drapper dependency
    public InstanceRepository(ServiceContext ctx)
    {
        this.ctx = ctx;
    }

    public void TrialLicenseCreate(string userName)
    {
        var config = AppInstance.Instance.Config;

        //create license
        var licenseCount = config.TrialMaxDeviceCount;
        var licenseDays = config.TrialDays;
        for (int i = 0; i < licenseCount; i++)
        {
            License license = new License();
            license.UserName = userName;
            license.LicenseType = LicenseType.Trial;
            license.GenerateDate = DateTime.Now;
            license.ValidDays = licenseDays;
            license.Status = LicenseStatus.InActive;
            ctx.Licenses.Add(license);
        }

    }

    public Instance InstanceCreate(string userName)
    {
        var instance = ctx.Instances.FirstOrDefault(x => x.UserName == userName);
        if (instance != null) { return instance; }

        var resourceServer = AppInstance.Instance.Config.ResourceServers.First().Domain;

        instance = new Instance();
        instance.UserName = userName;
        instance.CreateDate = DateTime.Now;
        instance.FileServer = resourceServer;
        instance.MQTTServer = AppInstance.Instance.Config.MQTTServer;

        instance.IsTrial = true;
        ctx.Instances.Add(instance);

        TrialLicenseCreate(userName);
        ctx.SaveChanges();
        return instance;
    }

}