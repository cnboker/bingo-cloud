FROM node:16
RUN mkdir -p /usr/jsxbuild
WORKDIR /usr/jsxbuild

COPY  package.json /usr/jsxbuild/
RUN npm install

COPY . /usr/jsxbuild/

EXPOSE 8888

# RUN the app

CMD ["npm", "start"]