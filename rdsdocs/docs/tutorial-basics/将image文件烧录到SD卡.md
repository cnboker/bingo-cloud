---
sidebar_position: 3
---

# 将image文件烧录到SD卡

## 准备工作

* Raspberry Pi 4
* TF 卡(8G以上)
* HDMI 线
* 键盘鼠标(可选)

## 制作WebOS启动盘

* 下载WebOS OSE最新版本,最新版本 [下载](http://build.webos-ports.org/webosose/), 或者自己动手编译， 编译说明移步到这里[编译WebOS](./%E7%BC%96%E8%AF%91webos.md)

* 将SD卡插入到主机

### 下载烧录工具并安装

 下载Raspberry Pi Imager, 一款刷机工具， 该工具类似于[balenaEtcher](https://www.balena.io/etcher/)，你可以到这里[下载](https://www.raspberrypi.com/software/), 根据主机系统请选择对应不同版本下载.

### 烧录

####  启动Imager工具
![](/img/image_start.png)

#### 选择操作系统， 选择自定义镜像

![](/img/2022-03-18-12-39-44.png)

#### 选择wic扩展的image文件

![](/img/2022-03-18-12-41-26.png)


#### 选择安装的目标SD存储卡

![](/img/2022-03-18-12-42-34.png)

#### 烧录

![](/img/2022-03-18-13-02-46.png)
#### 烧录完成

![](/img/2022-03-18-13-05-36.png)

## 修改屏参


如果是1920x1080的屏幕,可以忽略该节内容.

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

## 解决鼠标延迟问题

打开烧录的SD卡更目录cmdline.txt文件， 添加下面代码进去

* 注意在同一行加入用空格隔开，不能换行

```bash
usbhid.mousepoll=0

```

## 启用4k视频播放
打开config.txt, 添加下面一行代码

hdmi_enable_4kp60=1