FROM node:16 as BUILD_IMAGE
RUN mkdir -p /usr/mail
WORKDIR /usr/mail

COPY . .

RUN npm install && npm run build

# Here we will use alpine; alpine is a lean docker iamge with
# minimum packages but enough to run node applications.
# By using alpine the image size dropped to 200M from 1G
FROM node:16-alpine
RUN mkdir -p /usr/mail
WORKDIR /usr/mail

COPY --from=BUILD_IMAGE /usr/mail/dist ./dist
COPY --from=BUILD_IMAGE /usr/mail/node_modules ./node_modules

EXPOSE 8025

CMD ["node", "./dist/index.js"]