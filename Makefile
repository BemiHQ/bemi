core-install:
	@devbox run "cd core && pnpm install"
core-test:
	@devbox run "cd core && pnpm test"

worker-setup:
	@cd worker && \
		([ ! -d debezium-server ] && \
		curl -O https://repo1.maven.org/maven2/io/debezium/debezium-server-dist/2.5.0.Final/debezium-server-dist-2.5.0.Final.tar.gz && \
		tar -xvf debezium-server-dist-2.5.0.Final.tar.gz && \
		rm debezium-server-dist-2.5.0.Final.tar.gz) || true
worker-install: worker-setup
	@devbox run "cd worker && pnpm install"
worker-up:
	@devbox run "cd worker && pnpm concurrently -- \"pnpm:up:*\""

docs-install:
	@devbox run "cd docs && pnpm install"
docs-up:
	@devbox run "cd docs && pnpm start"
docs-build:
	@devbox run "cd docs && pnpm build"

sh:
	@devbox shell
