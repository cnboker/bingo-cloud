# MQTT 使用说明

安装配置mqtt-server说明，安装mqtt-cli及如何使用说明

## 开始

### mqtt-server 安装启动说明 (以下以macos安装为例说明)

- 安装地址 <https://mosquitto.org/download/>

- 安装命令:

``` shell
  brew install mosquitto
```

- 启动mqtt server命令：      /usr/local/sbin/mosquitto -c /usr/local/etc/mosquitto/mosquitto.conf

- 为了实现mqtt server 支持web socket通信，需要在mosquitto.conf 增加
  
  allow_anonymous true

  listener 1883

  listener 8000

  protocol websockets

### mqtt-cli 安装启动说明

- 安装地址：<https://hivemq.github.io/mqtt-cli/docs/quick-start/>

- 安装命令
  
```shell
 brew install hivemq/mqtt-cli/mqtt-cli
```

- 向服务器推送信息:

``` shell
 mqtt pub -t "/mqttContentNotify/E4:5F:01:41:37:34" -m "{root:'http://192.168.50.71/8080/scott/', files:['index.html','I0o5hgMS86.js','main.css']}"
```

### mosquitto in docker

- 安装mosquitto 

``` shell
docker pull eclipse-mosquitto
```
- 本地创建目录mosquitoo,在mosquitoo目录下创建config目录,把自定义mosquitto.conf文件放入config目录下
- 执行docker 启动命令
  
``` shell
docker-compose up
#or
sudo docker run -d --restart always --name mosq --network myNetwork \
  -p 1883:1883 -p 8000:8000 \
  -v $(pwd)/mosquitto:/mosquitto \
  eclipse-mosquitto
```
