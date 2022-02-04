# webos ose 实现数字标牌相关技术说明

## webos ose 在raspberry 上安装

### 2k屏在raspberry上的屏参配置

[参数参考](http://wiki.sunfounder.cc/index.php?title=Adjust_Resolution_for_Raspberry_Pi)

```bash
    #2560x1440(2k),60hz,16:8的屏幕
    hdmi_cvt 2560 1440 60 3 0 0 0
    #hdmi_group=2 means DMT (Display Monitor Timings; the standard typically used by monitors)
    hdmi_group=2
    #hdmi_mode=87 indicates the resolution mode we set before.
    hdmi_mode=87
    #max_framebuffer_width=2560
    #max_framebuffer_height=1440
    #required
    hdmi_drive=1
    hdmi_boost=7
    #required,Enables the ignoring of EDID/display data if your display is a crappy Chinese one
    hdmi_ignore_edid=0xa5000080
```

### webos ose 在raspberry 上安装步骤

注：采用官网上的shell无法刷机成功， 后来使用Raspberry PI Imager工具刷机成功

[image下载地址](http://build.webos-ports.org/webosose/)

## webos ose 配置

记录如果自启动ipk app,如何实现静态文件server.


### webos ose app自启动

webos ose 采用systemd做系统自启动，在/lib/systemd/system/目录下创建dclientStart.service文件，在此文件中添加如下脚本

参考内容 https://www.webosose.org/blog/2020/09/08/run-a-custom-script-at-boot-time/

```bash
[Unit]
Description=webos - "%n"
 
[Service]
Type=oneshot
ExecStart=/usr/bin/luna-send -n 1 -f luna://com.webos.service.applicationmanager/launch '{ "id" : "com.ioliz.dc.app"}'
```

创建symbolic link

```bash
cd lib/systemd/system
ln -s dclientStart.service ./webos-bd.target.wants/
```

Reboot

```bash
reboot -f
```

Check

```bash
systemctl status dclientStart
```

### webos ose 安装npm

webos ose 默认不支持npm，需要远程安装

```shell
    # install npm
    curl -0 -L https://npmjs.com/install.sh | sudo sh
```

### weos ose 安装pm2 实现程序自启动

安装pm2

```shell
    npm install -g pm2
    #enable reboot service
    pm2 startup -u nodeuser
    
```

### webos ose 实现静态文件服务器， 并实时stream播放

### webos ose 部分mp4不能播放方案思考

## 视频文件编解码

### ffmpeg 解码说明

查看视频文件参数命令

```shell
    ffmpeg -i pipe.mp4 -f null -
```
### 如果在webos ose 上实现硬件加速
