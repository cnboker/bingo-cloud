docker network create myNetwork
docker run --name=mysql -p 3306:3306 --network=myNetwork -v /home/scott/code/ioliz/data/mysql:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=1 -d mysql/mysql-server
docker run --name=member_server -p 7800:80 --network=myNetwork -d member_server
docker run --name=service_server -p 6001:80 --network=myNetwork -d service_server