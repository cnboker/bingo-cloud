#!/bin/bash

set -e
run_cmd="dotnet fileServer.dll --urls http://*:80"
exec $run_cmd