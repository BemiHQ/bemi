---
title: Bemi and Render Integration - Audit Trail and Data Tracking
sidebar_label: Render
hide_title: true
description: Learn how to configure your Render database with Bemi for real-time data tracking using Change Data Capture (CDC). Includes detailed setup instructions for connections and WAL levels.
keywords: [Bemi, Render, PostgreSQL, Change Data Capture, real-time data tracking, audit trail, WAL, logical replication]
image: 'img/social-card.png'
---

# Render

## WAL level

Please submit a Render support request, and they'll run a special runbook to set up Bemi:

> In a few words, what can we help you with?

```
Configure database for Bemi
```

> Describe the issue in more detail.

```
- Set "wal_level" to "logical"
- Add "REPLICATION" permission to the database user
- Create "bemi" publication
```

## Connection

To connect a [Render](https://render.com/) database, specify your database credentials that can be found on the Render dashboard:

* Please use the full `Host` name that ends with `.render.com` from the External Database URL section

![](/img/perm-render.png)

*Note that you can't create new credentials with `REPLICATION` permissions in Render.*
