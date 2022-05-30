#!bin/bash
#删除未被使用的资源
docker system prune -f

#rebuild
cd ../member
docker-compose build
cd ../fileServer
docker-compose build
cd ../service
docker-compose build
cd ../jsxBuildServer
docker-compose build
#cd ../ffmpegServer
#docker-compose build
cd ../reverseProxy
docker-compose down
docker-compose build
docker-compose up