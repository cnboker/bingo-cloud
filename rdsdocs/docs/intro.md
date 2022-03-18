---
sidebar_position: 1
---

# 简介

#### 名词解释
  * RDS -- Raspberry Digital Signage(树莓派数字标牌) 的缩写
  * RDS Player --- 树莓派板播放器, 该文档会解释如何把播放器安装到树莓派系统上
  * WebOS OSE --- WebOS 开源操作系统， 基于WEB生态的操作系统, 有超过70万台 LG Smart TVs 跑该系统, 目前由厂商LG维护.
  * Raspberry Pi Imager --- 刷机工具，可以利用该工具将WebOS系统安装到TF卡上
  * WebOS CLI --- WebOS 命令行工具，通过该工具可以远程连接WebOS设备、创建，打包，发布，调试目标程序
  * IPK --- WebOS 系统应用程序
  * Host Operation System(主机操作系统) --- 任何安装MacOS,Linux,Windows的主机，通过该主机可以远程访问树莓派操作系统

RDS(Raspberry Digital Signage)Player是专门为Raspberry Pi 4设计的一款App，利用Raspberry Pi 4作为基板实现数字标牌的常见应用，RDS Player基于[WebOS OSE](https://www.webosose.org/)操作系统开发，实现图片，视频，时钟，天气，网页，pdf等播放功能.

## 材料准备

为了让系统跑起来了， 你至少需要准备以下部件.

- 一块树莓派4模型B板,[了解更多](#).
- 2G 大小或更多容量的TF卡
- WebOS OSE 2.0以上版本image下载文件
- 一台主机

## RDS Player安装步骤

* 下载WebOS OSE最新版本,最新版本[下载](http://build.webos-ports.org/webosose/)
* 下载Raspberry Pi Imager, 一款刷机工具， 该工具类似于[balenaEtcher](https://www.balena.io/etcher/)，你可以到这里[下载](https://www.raspberrypi.com/software/), 根据主机系统请选择对应不同版本下载.


* 将做好的TF卡插入树莓派4模型B，同时插入鼠标和键盘， 启动系统， 系统会引导自动安装系统，安装完成，鼠标从桌面顶部向下拖拉系统， 会弹出设置图标，点击“配置按钮"设置无线网络或直接插网线也行，确保工作电脑和树莓板为同一网段， 并记下树莓板的ip地址

![Webos启动画面](/img/webosose-2_0-bootup-launcher.jpeg)

## 在主机操作系统安装WebOS OSE命令行工具
  
    命令工作的主要目的就是远程安装RDS Player程序到树莓派系统上

### 主机操作系统需求

| OS      | 版本                                   |
| ------- |------------------------------------ |
| Linux   | Ubuntu 18.04 LTS 64-bit              |
| macOS   | Mac OS X 10.13 High Sierra or higher |
| Windows | Windows 10 64-bit                    |


### 主机软件工具

* Node.js (V10.24.1 to V14.15.1)
* npm


### 主机安装CLI

```sh
$ npm install -g @webosose/ares-cli

# Check the intallation

$ ares --version
Version: 2.x.x
```

### 主机连接树莓派设备

  记下树莓派系统ip,并确保该ip和主机在同一网段
```sh
#列出所有关联远程设备
ares-setup-device --list 
#增加远程设备到设备列表
# target表示自定义设备名称，
# host地址:192.168.50.205,即树莓派系统ip
# port：22， ssh默认端口
# user: root
# default=true 表示默认设备

ares-setup-device --add target -i "host=192.168.50.205" -i "port=22" -i "username=root" -i "default=true" 
# 远程安装xxx.ipk 应用到目标设备target
ares-install -d target xxx.ipk 
# 远程登录设备target
ares-shell -d target 

```

