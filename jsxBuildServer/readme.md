# 编译说明

## 运作原理

### httpserver

httpserver 接受post数据， post数据由postHandler存储随机文件并将该文件放入entry目录, 该文件作为esbuild的entryPoints参数，执行build
### compiler
call esbuild.js后在publish目录生成index.html,并回传虚拟路径给调用端