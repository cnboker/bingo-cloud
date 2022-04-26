FROM node:alpine
RUN mkdir -p /usr/jsxbuild
WORKDIR /usr/jsxbuild

COPY  package.json .
RUN npm install

COPY . .

EXPOSE 8888

# RUN the app

CMD ["npm", "start"]