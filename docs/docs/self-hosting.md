---
title: 'Self-Hosted Automatic Audit Trail for PostgreSQL'
hide_title: true
sidebar_label: Self-Hosting
description: 'Self-host a 100% reliable database change tracking solution for troubleshooting, reporting, data recovery, and audit purposes.'
image: 'img/social-card.png'
keywords: ['Open source', 'Database Tracking', 'Postgres Audit Trails', 'Change Data Capture', 'Database Changes']
---

# Self-Hosting

<a class="github-button" href="https://github.com/BemiHQ/bemi" data-size="large" data-show-count="true" aria-label="Star BemiHQ/bemi on GitHub">BemiHQ/bemi</a>
<br />
<br />

When self-hosting Bemi, your data never leaves your premises.

![Bemi Worker Architecture](/img/worker.png)

Bemi consists of three main parts:

1. [Debezium](https://github.com/debezium/debezium), a very flexible tool for implementing Change Data Capture that is written in Java. It is used by many companies that need to implement ETL such as [Airbyte](https://github.com/airbytehq/airbyte) and [Materialize](https://github.com/MaterializeInc/materialize). We rely on it to be able to connect to PostgreSQL replication log, perform logical decoding, and send raw data to a data sink.
2. [NATS JetStream](https://github.com/nats-io/nats-server), a cloud-native messaging system written in Go. Debezium is historically designed to send data to Kafka, but it can be also re-configured to send data to NATS JetStream. It is much more lightweight and easy to manage while being very performant and having over 45 clients for different programming languages.
3. Bemi Worker, a process responsible for stitching data change with app context sent via our open-source [ORM packages](https://docs.bemi.io/#supported-orms) and storing data changes. It is written in TypeScript and uses the [`core`](https://github.com/BemiHQ/bemi) that we rely on for our [Bemi](https://bemi.io/) cloud platform.

You can try it out locally by using a Docker image:

```sh
docker run \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5434 \
  -e DB_NAME=bemi_dev_source \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  public.ecr.aws/bemi/dev:latest
```

`DB_HOST` pointing to `host.docker.internal` allows accessing `127.0.0.1` on your host machine if you run PostgreSQL outside Docker. See [github.com/BemiHQ/bemi](https://github.com/BemiHQ/bemi) for more information.

|                                   | Self-Hosting (OSS)  | Bemi Cloud  |
| --------------------------------- | ------------------- | ----------- |
| PostgreSQL source database        | ✅                  | ✅          |
| Automatic data change tracking    | ✅                  | ✅          |
| Automatic application context     | ✅                  | ✅          |
| Audit Trail UI                    | ❌                  | ✅          |
| Priority support                  | ❌                  | ✅          |
| Automatic table partitioning      | ❌                  | ✅          |
| Automatic data retention          | ❌                  | ✅          |
| Autoscaling and high availability | ❌                  | ✅          |
| Column-based filter rules         | ❌                  | ✅          |
| Automatic updates and backups     | ❌                  | ✅          |
| Control plane and monitoring      | ❌                  | ✅          |

## Self-Hosting Enterprise

Bemi Self-Hosting Enterprise is the most robust way to run Bemi yourself. With this option, you'll get all the optimizations and UI functionality of Bemi Cloud.

To start with Self-Hosting Enterprise, you'll need a valid license key. [Talk to us](https://cal.com/bemihq) to get started.
