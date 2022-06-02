#!bin/bash
#删除未被使用的资源
docker system prune -f

#rebuild
cd ../dotnetcoreServer/member
docker-compose build
cd ../dotnetcoreServer/fileServer
docker-compose build
cd ../dotnetcoreServer/service
docker-compose build
cd ../jsxBuildServer
docker-compose build
#cd ../ffmpegServer
#docker-compose build
docker network create myNetwork
cd ../reverseProxy
docker-compose down
docker-compose build
docker-compose up -d
