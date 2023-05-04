#!bin/bash


git reset --hard
git pull


#rebuild
cd ../dotnetcoreServer
#docker-compose build
sudo docker container stop authapi
sudo docker container rm authapi
sudo docker image build --tag authapi:latest --file ./member/Dockerfile . # ../:docker context
docker run --detach --restart always --name authapi --publish 7800:7800 --network myNetwork authapi:latest


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
