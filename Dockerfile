FROM node:16 as build-client
WORKDIR /app/client
COPY client/package.json client/yarn.lock ./
RUN yarn
COPY client/public public
COPY client/tsconfig.json ./
COPY client/src src
COPY common src/common
RUN yarn build

FROM node:16 as build-server
WORKDIR /app/server
COPY server/package.json server/yarn.lock ./
RUN yarn
COPY server/tsconfig.json ./
COPY server/src src
COPY common src/common
RUN yarn build

FROM node:16
WORKDIR /app
COPY server/package.json server/yarn.lock ./
RUN yarn install --production
COPY --from=build-server /app/server/dist server
COPY --from=build-client /app/client/build public
CMD ["node", "--es-module-specifier-resolution=node", "server/index"]