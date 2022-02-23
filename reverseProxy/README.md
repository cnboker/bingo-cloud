# 使用nginx做反向代理

## 概述

nginx 需要代理的服务包括:

* [文件服务](../fileServer/README.md)
* [认证授权服务](../member/README.md)
* [基础业务服务](../service/README.md)
* [ipk编译服务](../jsxBuildServer/README.md)
* [前端app](../app/README.md)

## 创建同一网段，确保docker 服务在同一网段可以相互访问

```
docker network create myNetwork
```

## 建立 mysql docker

### 创建mysql docker
```bash
# -v volume d:/data是本地目录, /var/lib/mysql 是容器默认目录
# --restart=always ： 重启服务器自动启动服务
# --name=mysql ： docker 服务名称
# -d : deamon模式启动
# --network=myNetwork ： 使用服务网段myNetwork
docker run --name=mysql -h mysql -p 3306:3306 --network=myNetwork --restart=always -v /home/data/mysql:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=1 -d mysql/mysql-server 

docker exec -it mysql bash

docker ps
# list all container
docker ps -a
```
### 获取 mysql docker ip

``` bash
 docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mysql
```

### 打开appsettings.json手动更新member, server服务数据库连接字符串连接字符串

### upgrade nodejs

```
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 服务器发布目录结构

├── /home
│   ├── data
|   |    └-----files #文件服务器根目录
|   |    └-----mysql #数据库根目录
|   |
|   |
│   └── ioliz #源代码
|        └-----_wwww/build #网站目录


