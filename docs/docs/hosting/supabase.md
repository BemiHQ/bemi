---
title: Bemi and Supabase Integration - Audit Trail and Data Tracking
sidebar_label: Supabase
hide_title: true
description: Learn how to configure your Supabase database with Bemi for real-time data tracking using Change Data Capture (CDC). Includes detailed setup instructions for connections and WAL levels.
keywords: [Bemi, Supabase, PostgreSQL, Change Data Capture, real-time data tracking, audit trail, WAL, logical replication]
image: 'img/social-card.png'
---

# Supabase

## WAL level

Supabase provisions PostgreSQL with the WAL level already set to `logical`. So, it is ready to be used.

## Connection

To connect a [Supabase](https://supabase.com/partners/integrations/bemi) database, you need to go to your Supabase project settings, untoggle "Use connection pooling",
and use these connection details on Bemi to connect to the replication log.

![](/img/perm-supabase.png)

*Note that you can't create new credentials with `REPLICATION` permissions in Supabase, see [this discussion](https://github.com/orgs/supabase/discussions/9314).*
