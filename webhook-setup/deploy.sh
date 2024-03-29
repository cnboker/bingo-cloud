#!bin/bash

# Although Compose works in all environments, it's more focused
# development and testing. Using Compose on a production environment is not recommended at all.

git reset --hard
git pull

#删除未被使用的资源
docker system prune -f
docker network create myNetwork
#rebuild
cd ../dotnetcoreServer
#docker-compose build
sudo docker container stop authapi
sudo docker container rm authapi
sudo docker image build --tag authapi:latest --file ./member/Dockerfile . # ../:docker context
# docker container run \
#     --rm \ #自动删除旧的container
#     --detach \ #后台执行
#     --restart always \ #host 启动自动重启
#     --name authapi \ #名字
#     --publish 7800:7800 \ #端口map
#     --network myNetwork \ #bridge network
#     authapi:latest
docker run --detach --restart always --name authapi --publish 7800:7800 --network myNetwork authapi:latest

#cd ../dotnetcoreServer/fileServer
#docker-compose build
docker container stop fileapi
docker container rm fileapi
docker image build --tag fileapi:latest --file ./fileServer/Dockerfile .
docker run --detach --restart always --name fileapi --publish 5000:5000 --network myNetwork --volume /home/data/files:/release/wwwroot fileapi:latest

#cd ../dotnetcoreServer/service
#docker-compose build
sudo docker container stop serviceapi
sudo docker container rm serviceapi
sudo docker image build --tag serviceapi:latest --file ./service/Dockerfile .
sudo docker run --detach --restart always --name serviceapi --publish 6001:6001 --network myNetwork serviceapi:latest

cd ../jsxBuildServer
#docker-compose build
docker container stop jsxbuild
docker container rm jsxbuild
docker image build --tag jsxbuild:latest .
docker run --detach --restart always --name jsxbuild --publish 8888:8888 --network myNetwork jsxbuild:latest


cd ../ffmpegServer
#docker-compose build
docker container stop ffmpegapi
docker container rm ffmpegapi
docker image build --tag ffmpegapi:latest .
docker run --detach --restart always --name ffmpegapi --publish 9000:9000 --network myNetwork ffmpegapi:latest


cd ../reverseProxy
#docker network create myNetwork
docker container stop nginxserver
docker container rm nginxserver
docker image build --tag nginxserver:latest .
docker run --detach --restart always --name nginxserver --publish 80:80 --network myNetwork --volume /home/ubuntu/dist/app:/www/app --volume /home/ioliz/_www:/www nginxserver:latest

#docker-compose down
#docker-compose build
#docker-compose up -d 

#fileServer 经常出现数据目录无法挂载的情况，出现这种问题，直接使用命令docker-compose up --force-recreate