FROM node:16
# VOLUME [ "/root" ]
RUN apt update -y && apt install -y ffmpeg 
# ADD setup-ffmpeg.sh /root
# RUN ["chmod", "+x", "/root/setup-ffmpeg.sh"]
# RUN /root/setup-ffmpeg.sh
# create app dir
WORKDIR /usr/app

COPY package*.json ./

# install app dependencies
RUN npm install          

COPY . .

EXPOSE 9000

CMD ["node", "index.js"]

