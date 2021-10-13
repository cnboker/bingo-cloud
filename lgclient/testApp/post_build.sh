#!/bin/bash

echo start post build
ares-package ./dist -o ./dist
# cp ./build/com.lg.app.signage_0.0.1_all.ipk /Volumes/ESD-USB/application/com.lg.app.signage.ipk
ares-install --device target ./dist/com.ioliz.lgclient.testapp_1.0.0_all.ipk
ares-launch --device target com.ioliz.lgclient.testapp
ares-inspect --device target com.ioliz.lgclient.testapp
# rm ./build/com.lg.app.signage_0.0.1_all.ipk