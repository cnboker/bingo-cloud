## 关于工厂登录切换到客户账户的实现逻辑

* 原来工厂操作客户数据，需要用客户账户登录进行操作， 为了实现不用切换账户功能，需要对网页client对象进行改造
原先client对象的属性包括access_token,expired,usersetting, isAgent,userName; 为了实现账户的自由切换，在
增加一个属性factory,factory也包含上面几个属性，一个工厂账户登录，工厂账户是可以自由切换到他的客户账户的，当做切换的时候， 工厂账户调用 /api/customerToken{clientUserName},获取token, 原先access_token,expired,usersetting,isAgent,userName数据迁移到factory属性下， 获取的新的数据把原先的数据覆盖，这个时候所有调用API的接口都是用客户的TOKEN调用了， 如果切换回工厂账户，则将factory下的数据重新覆盖


## This application consists of:

*   Sample pages using ASP.NET Core MVC
*   [Bower](https://go.microsoft.com/fwlink/?LinkId=518004) for managing client-side libraries
*   Theming using [Bootstrap](https://go.microsoft.com/fwlink/?LinkID=398939)

## How to

*   [Add a Controller and View](https://go.microsoft.com/fwlink/?LinkID=398600)
*   [Add an appsetting in config and access it in app.](https://go.microsoft.com/fwlink/?LinkID=699562)
*   [Manage User Secrets using Secret Manager.](https://go.microsoft.com/fwlink/?LinkId=699315)
*   [Use logging to log a message.](https://go.microsoft.com/fwlink/?LinkId=699316)
*   [Add packages using NuGet.](https://go.microsoft.com/fwlink/?LinkId=699317)
*   [Add client packages using Bower.](https://go.microsoft.com/fwlink/?LinkId=699318)
*   [Target development, staging or production environment.](https://go.microsoft.com/fwlink/?LinkId=699319)

## Overview

*   [Conceptual overview of what is ASP.NET Core](https://go.microsoft.com/fwlink/?LinkId=518008)
*   [Fundamentals of ASP.NET Core such as Startup and middleware.](https://go.microsoft.com/fwlink/?LinkId=699320)
*   [Working with Data](https://go.microsoft.com/fwlink/?LinkId=398602)
*   [Security](https://go.microsoft.com/fwlink/?LinkId=398603)
*   [Client side development](https://go.microsoft.com/fwlink/?LinkID=699321)
*   [Develop on different platforms](https://go.microsoft.com/fwlink/?LinkID=699322)
*   [Read more on the documentation site](https://go.microsoft.com/fwlink/?LinkID=699323)

## Run & Deploy

*   [Run your app](https://go.microsoft.com/fwlink/?LinkID=517851)
*   [Run tools such as EF migrations and more](https://go.microsoft.com/fwlink/?LinkID=517853)
*   [Publish to Microsoft Azure Web Apps](https://go.microsoft.com/fwlink/?LinkID=398609)

We would love to hear your [feedback](https://go.microsoft.com/fwlink/?LinkId=518015)
