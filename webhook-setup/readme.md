
## 关于webhook

webhook

## 安装webhook

```bash
#从github webhook库下载最新版本,上传到服务器
chmod +x webhook
chmod +x deploy.sh
cp webook /usr/bin
cd /home/ioliz/webhook-setup

### 启动服务
 s
```bash
sudo systemctl start webhook.service
sudo systemctl enable webhook.service
sudo systemctl daemon-reload
```

### github 配置

chrome 打开github进入ioliz项目， 点击设置页面， 右面菜单栏点击"webhook", 在webhook设置页面添加

PayloadURL: 设置服务器回调地址 http://xxxx:9000/hooks/{id} 这里的id即hooks.json内容中的id值

Content type: 选择application/json

Secret: 对应hooks.json中的secret

点击"update webook" 将库提交测试能否正常执行deply.sh任务

### kill process

``` bash
 sudo kill -9 `pidof webhook`
```
