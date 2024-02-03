<div align="center">
  <a href="https://bemi.io">
    <img width="1201" alt="bemi-banner" src="https://docs.bemi.io/img/bemi-banner.png">
  </a>

  <p align="center">
    <a href="https://bemi.io">Website</a>
    ·
    <a href="https://docs.bemi.io">Docs</a>
    ·
    <a href="https://github.com/BemiHQ/bemi/issues/new">Report Bug</a>
    ·
    <a href="https://github.com/BemiHQ/bemi/issues/new">Request Feature</a>
    ·
    <a href="https://discord.gg/mXeZ6w2tGf">Discord</a>
    ·
    <a href="https://twitter.com/BemiHQ">Twitter</a>
    ·
    <a href="https://www.linkedin.com/company/bemihq/about">LinkedIn</a>
  </p>
</div>

# Bemi

## Running locally

```sh
make worker-install

export DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=postgres DB_USER=postgres DB_PASSWORD=postgres
make worker-up
```

## Testing

```sh
make core-install
make core-test
```

## Architecture

![Bemi Worker Architecture](docs/static/img/worker.png)

## License

Distributed under the terms of the [SSPL-1.0 License](/LICENSE). If you need to modify and distribute the code, please release it to contribute back to the open-source community.
