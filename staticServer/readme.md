ffmpeg -re -stream_loop -1 -i ./videos/hike.mp4 -f rtsp -rtsp_transport tcp rtsp://localhost:8888/live


ffmpeg -i ./videos/sniper.mp4 -vf scale=1920x1080 -b:v 1800k \
  -minrate 900k -maxrate 2610k -tile-columns 2 -g 240 -threads 8 \
  -quality good -crf 31 -c:v libvpx-vp9 -c:a libopus \
  -pass 1 -speed 4 pipe.mp4 && 

#转化成1080p,码率1800k, 27帧/秒
ffmpeg -i ./videos/sniper.mp4 -b:v 1800k -minrate 900k -maxrate 2610k -r 27 -vf scale=-1:1080 -c:a libopus pipe.mp4