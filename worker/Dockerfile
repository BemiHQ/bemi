FROM --platform=linux/amd64 node:21-bookworm AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@8.8.0

WORKDIR /worker

COPY package.json pnpm-lock.yaml ./

################################################################################

FROM base AS deps

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

################################################################################

FROM base AS build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store mv ./core ../core && cd ../core && pnpm install --frozen-lockfile

RUN pnpm run build

################################################################################

FROM base

RUN apt update && \
  apt install -y default-jre && \
  curl -O https://repo1.maven.org/maven2/io/debezium/debezium-server-dist/2.5.0.Final/debezium-server-dist-2.5.0.Final.tar.gz && \
  tar -xvf debezium-server-dist-2.5.0.Final.tar.gz && \
  rm debezium-server-dist-2.5.0.Final.tar.gz && \
  curl -sf https://binaries.nats.dev/nats-io/nats-server/v2@v2.10.9 | sh

COPY --from=deps /worker/node_modules /worker/node_modules
COPY --from=build /worker/dist /worker/dist

COPY application.properties ./
COPY debezium.sh ./
COPY run.sh ./

CMD ["sh", "./run.sh"]
