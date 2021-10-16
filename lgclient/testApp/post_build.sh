#!/bin/bash

echo start post build
ares-package /Users/scott/code/ioliz/lgclient/testapp/build /Users/scott/code/ioliz/lgclient/service/fileService/dist -o /Users/scott/code/ioliz/lgclient/testapp/build 

ares-install --device target ./build/com.ioliz.lgclient.testapp_1.0.0_all.ipk
ares-launch --device target com.ioliz.lgclient.testapp
ares-inspect --device target com.ioliz.lgclient.testapp
