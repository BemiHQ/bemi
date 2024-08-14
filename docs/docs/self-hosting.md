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

If you want to self-host our solution in a production environment, please [contact us](https://bemi.io/contact-us),
and we'll be happy to provide you with a Docker image and assist with configuring the system in exchange for your feedback :)

## Self-Hosting (OSS) vs Bemi Cloud
|                                   | Self-Hosting (OSS)  | Bemi Cloud  |
| --------------------------------- | ------------------- | ----------- |
| PostgreSQL source database        | ✅                  | ✅          |
| Automatic data change tracking    | ✅                  | ✅          |
| Automatic application context     | ✅                  | ✅          |
| Included support                  | ✅                  | ✅          |
| Automatic table partitioning      | ❌                  | ✅          |
| Automatic data retention          | ❌                  | ✅          |
| Autoscaling and high availability | ❌                  | ✅          |
| Control plane and monitoring      | ❌                  | ✅          |
| Automatic updates                 | ❌                  | ✅          |
| Activity Log UI                   | ❌                  | ✅          |

## Self-Hosting Enterprise

Bemi Self-Hosting Enterprise is the most robust way to run Bemi yourself. With this option, you'll get all the optimizations and UI functionality of Bemi Cloud.

To start with Self-Hosting Enterprise, you'll need a valid license key. [Talk to us](https://cal.com/bemihq) to get started.
