FROM node:20-alpine3.18 as Base

WORKDIR /app

COPY package.json yarn.lock ./

RUN apk add --no-cache make gcc g++ python3

RUN yarn

COPY . .

RUN yarn build:tsc

FROM node:20-alpine3.18

WORKDIR /app

COPY --from=Base /app .

CMD [ "yarn", "start" ]
