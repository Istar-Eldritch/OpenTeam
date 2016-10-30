FROM node:6.4.0

WORKDIR /opt

COPY . /opt

RUN npm run setup

CMD npm start
