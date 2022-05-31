FROM node:16 as BUILD_IMAGE
# VOLUME [ "/root" ]
# update sources.list
ADD sources.list /etc/apt/
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

# Here we will use alpine; alpine is a lean docker iamge with
# minimum packages but enough to run node applications.
# By using alpine the image size dropped to 200M from 1G
FROM node:16-alpine
RUN mkdir -p /usr/app
WORKDIR /usr/app

COPY --from=BUILD_IMAGE /usr/app ./
COPY --from=BUILD_IMAGE /usr/app/node_modules ./node_modules

EXPOSE 9000

CMD ["node", "index.js"]

