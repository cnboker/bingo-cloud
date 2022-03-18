---
sidebar_position: 2
---
# 自己动手编译WebOS

## 编译环境要求

* Ubuntu 16.04 LTS (Xenial Xerus) 64-bit
* Ubuntu 18.04 LTS (Bionic Beaver) 64-bit
* Ubuntu 20.04 LTS (Focal Fossa) 64-bit

## 编译机器硬件要求

### CPU
* Minimum: Intel Core i5 dual-core with 4 threads
* Recommended: Intel Core i7 quad-core with 8 threads or higher

### RAM
* Minimum: 8 GB
* Recommended: 16 GB or higher

### Storage
* Minimum: HDD with 100 GB of free disk space
* Recommended: SSD with 100 GB of free disk space or more


## 安装git

```bash
 sudo apt-get update
 sudo apt-get install git
 git --version
```

## 克隆库

```bash
git clone https://github.com/webosose/build-webos.git
cd build-webos
```

## 安装必要工具

build之前，需要安装不要工具， 执行下面脚本完成

```
sudo scripts/prerequisites.sh
```

## 配置编译参数

### 设置并行参数 -p -b 参数值的计算如下

```bash
#获取物理CPU数量
cat /proc/cpuinfo | grep "physical id" | sort | uniq | wc -l
#获取CPU核数量
cat /proc/cpuinfo | grep "cpu cores" | uniq
#总核数
# cpu数*核数,比如1个CPU，8核， 总核数量=1*8
# -p 和-b 值计算
# 总核数量/2 就是-p -b值

# 执行配置参数
# ./mcf -p <number of physical CPU cores / 2> -b <number of physical CPU cores / 2> <target-device-name>
 sudo ./mcf -p 4 -b 4 raspberrypi4-64

```
 target-device-name 值包括：

* raspberrypi4 (for 32-bit webOS OSE 2.0 or higher)
* raspberrypi4-64 (for 64-bit webOS OSE 2.0 or higher)
* raspberrypi3 (for 32-bit webOS OSE 1.x version)
* raspberrypi3-64 (for 64-bit webOS OSE 1.x version)
* qemux86 (for 32-bit emulator)
* qemux86-64 (for 64-bit emulator)

## 编译Image

``` bash
make webos-image
```

## 检查编译好的image

* Raspberry PI 4 生成目录
 
  32-bit: BUILD/deploy/images/raspberrypi4/webos-image-raspberrypi4.rootfs.wic

  64-bit: BUILD/deploy/images/raspberrypi4-64/webos-image-raspberrypi4-64.rootfs.wic

## 清理

``` bash
rm -rf BUILD
./mcf.status

```


## 编译服务器选择

到腾讯云找竞价实例->硅谷服务器->按时计费， 8核16G至少要300G磁盘每小时才5毛钱，选择	
Ubuntu Server 20.04 LTS 64位 服务器，按照上面的步骤操作执行编译，如果编译遇到错误，执行

```bash
sudo rm -rf webos-build
```

执行完成重新上面的操作，我第一次执行错误， 删除重新执行正常了

## 从远程服务器下载编译好的image文件到本地

```
scp ubuntu@43.135.167.145:/home/ubuntu/build-webos/BUILD/deploy/images/raspberrypi4-64/webos-image-raspberrypi4-64.rootfs.wic c:/tmp

```

编译需要耗费大量磁盘，请准备300G,差不多10个小时的编译时间， 如果有需求可以联系我 6348816@qq.com