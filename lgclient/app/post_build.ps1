# #Remove-Item -Recurse -Force "../build"
#Start-Sleep -s 1
# #Copy-Item -Path "./build" -Destination "../build/app" -Recurse -force
#npm run build --prefix ../lib
#npm publish --prefix ../lib
#Start-Sleep -s 1
#npm i lgservice@latest --prefix ../service
#Start-Sleep -s 1
#Copy-Item -Path "../service" -Destination "./build" -Recurse -force
#Copy-Item -Path "./res" -Destination "./build" -Recurse -force
#$env:PATH = "/Users/scott/Downloads/Signage_SDK_Installer_mac64_min/webOS_SDK/CLI/bin"
#Set-Location ./build
#Start-Sleep -s 2
# ares-package --no-minify ./build  -o ./build
# Rename-Item ./build/com.lg.app.signage_0.0.1_all.ipk com.lg.app.signage.ipk

#Start-Sleep -s 3
# ares-install --device emulator ./build/com.lg.app.signage.ipk
# #Start-Sleep -s 1
# ares-launch --device emulator  com.lg.app.signage
# #Start-Sleep -s 1
# #Remove-Item ./com.lg.app.signage_0.0.2_all.ipk
# #Start-Sleep -s 1
# ares-inspect --device emulator  com.lg.app.signage

#!/bin/bash

$root = (get-item $pwd).parent.FullName

echo start post build
ares-package $root'/build' $root'/service/fileService/dist'  $root'/service/bootservice' -o $root'app/build'
# cp ./build/com.lg.app.signage_0.0.1_all.ipk /Volumes/ESD-USB/application/com.lg.app.signage.ipk
ares-install --device target ./build/com.ioliz.dc.app_1.0.0_all.ipk -v
ares-launch --device target com.ioliz.dc.app
ares-inspect --device target com.ioliz.dc.app
# rm ./build/com.lg.app.signage_0.0.1_all.ipk