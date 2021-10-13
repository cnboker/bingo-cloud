#!/bin/bash
echo start before build
cd /Users/scott/code/ioliz/lgclient/lib
npm run build
cd /Users/scott/code/ioliz/lgclient/testApp
npm link lgservice