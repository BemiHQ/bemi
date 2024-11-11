FROM node:18 AS base
RUN corepack enable pnpm

WORKDIR /worker
COPY package.json pnpm-lock.yaml ./

FROM base AS deps
RUN pnpm install --prod --frozen-lockfile

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . ./
RUN mv ./core ../core && cd ../core && pnpm install --frozen-lockfile
RUN pnpm run build

FROM base
COPY --from=deps /worker/node_modules /worker/node_modules
COPY --from=build /worker/dist /worker/dist

COPY run.sh ./

CMD ["sh", "./run.sh"]
