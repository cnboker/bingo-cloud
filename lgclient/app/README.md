
## package

ares-package ./my-app/build

### install

ares-install --device emulator com.lg.app.signage_0.0.1_all.ipk

### launch

ares-launch --device  emulator com.lg.app.signage
### lanuch close 

ares-launch --device  emulator com.lg.app.signage --close

### debug
ares-inspect --device emulator --app com.lg.app.signage
### device debug
http://webossignage.developer.lge.com/develop/development-process/debugging-your-app/debugging-device/#ipk-enable

### how to download reomte file to localstorage

### how to load local file dynamic


### js service, create js service project
### hello-service is template name, com.log.app.signage.myService is serveice project name, com.log.app.signage ia app's name
ares-generate -t hello-service com.lg.app.signage.myService

### install js service

### deply app
http://webossignage.developer.lge.com/develop/development-process/app-deploying/local-storage-deploying/#usb
http://webossignage.developer.lge.com/device/general-settings/server-info/


### npm link
file lib run : npm link
app run: npm link lgservice

### password
us.lgaccount.com
13927459677@139.com
Flzx3qc14yhl9T


### ares cmd
ares-setup-device --list // 列出所有关联远程设备
ares-setup-device --add target -i "host=192.168.50.205" -i "port-22" -i "username-root" -i "default=true" // 添加远程关联设备，使用ssh关联， 默认远程密码没有
ares-setup-device --default target //设置默认远程设备
ares-install --device target com.domain.app_1.0.0_all.ipk //远程安装app
ares-shell --device target //远程shell
