FROM node:carbon
VOLUME [ "/root" ]
ADD setup-ffmpeg.sh /root
RUN /root/setup-ffmpeg.sh
# create app dir
WORKDIR /usr/app
# install app dependencies

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 9000

CMD ["npm", "start"]

