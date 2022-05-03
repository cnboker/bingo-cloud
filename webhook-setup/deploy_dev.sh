#!bin/bash
cd ..
git reset --hard
git pull
#删除未被使用的资源
docker system prune -f
#delete old container
docker stop reverseproxy-authapi-1
docker stop reverseproxy-fileapi-1
docker stop reverseproxy-serviceapi-1
docker stop reverseproxy-ffmepapi-1
docker stop reverseproxy-jsxbuild-1
#rebuild
cd ../member
docker-compose build
cd ../fileServer
docker-compose build
cd ../service
docker-compose build
cd ../jsxBuildServer
docker-compose build
cd ../ffmpegServer
docker-compose build
cd ../reverseProxy
docker stop reverseproxy-reverseproxy-1
docker-compose up