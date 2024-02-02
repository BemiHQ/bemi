core-install:
	devbox run "cd core && pnpm install"
core-test:
	devbox run "cd core && pnpm test"

docs-install:
	devbox run "cd docs && pnpm install"
docs-up:
	devbox run "cd docs && pnpm start"
docs-build:
	devbox run "cd docs && pnpm build"

sh:
	devbox shell
