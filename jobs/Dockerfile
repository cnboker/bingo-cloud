FROM node:16
RUN mkdir -p /usr/mail
WORKDIR /usr/mail

COPY package.json .
RUN npm install

COPY . .

EXPOSE 8025

CMD ["node", "./src/index.js"]