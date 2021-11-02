# 编译说明

## 运作原理

### httpserver

httpserver 接受post数据， post数据由postHandle存储随机文件，并将该文件放入entry目录, 并将该文件作为esbuild的entryPoints参数，执行build
### compiler
call esbuild.ts后在publish目录生成index.html,并回传给调用端