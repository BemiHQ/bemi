---
title: 'Bemi Changelog: Automatic Audit Trail for PostgreSQL'
hide_title: true
sidebar_label: Changelog
description: 'Recently released features and improvements for Bemi. Database change tracking for troubleshooting, reporting, data recovery, and audit purposes.'
image: 'img/social-card.png'
keywords: ['Bemi Changelog', 'Bemi New Features', 'Postgres Audit Trails', 'Change Data Capture', 'Database Changes']
---

# Changelog

## 2024-07

* Dashboard
  * List ORM integrations for better onboarding experience
* Platform
  * Reduce provisioning time with automated workflows
  * Start SOC 2 security audit

## 2024-06

* Dashboard
  * Collapse diffs hiding unchanged values by default
* Platform
  * Enable tracking changes from non-`public` PostgreSQL schemas
  * Allow setting ignore-change column rules across all tables, such as `*.updatedAt`
  * Automatically delete old changes beyond the retention period
  * Add comprehensive ingestion monitoring
* [Bemi Core](https://github.com/BemiHQ/bemi)
  * Run type checks via CI/CD
* [Bemi Supabase JS](https://github.com/BemiHQ/bemi-supabase-js)
  * Create a new Supabase JS package to allow passing application context with data changes
* [Bemi SQLAlchemy](https://github.com/BemiHQ/bemi-sqlalchemy)
  * Create a new Python package to allow passing application context with data changes
* Integrations
  * [Neon](https://neon.tech/docs/guides/bemi): new integration guide

## 2024-05

* Dashboard
  * Allow copying change values as an SQL query statement to be able to rollback
  * Improve Browser UI performance for custom views with associations
  * Disable autocomplete for inputs by default
* Platform
  * Upgrade infrastructure to support IPv6 (dual stack)
* [Bemi Core](https://github.com/BemiHQ/bemi)
  * Use Well-Known Binary (WKB) representation for tracked PostGIS data
  * Add support for ingesting [PostgreSQL TOAST](https://www.postgresql.org/docs/current/storage-toast.html) values
  * Allow saving information about a PostgreSQL user who made data changes in the app context
* Integrations
  * [Supabase](https://supabase.com/partners/integrations/bemi): new partnership integration
  * [GCP Cloud SQL](https://docs.bemi.io/postgresql/source-database#gcp-cloud-sql): describe how to enable logical decoding and connect
  * [PowerSync](https://www.powersync.com): make ingestion worker compatible with a separate PostgreSQL replication

## 2024-04

* Dashboard
  * Implement custom views and data clusters (opt in beta)
  * Show data usage across all environments in a new chart
  * Improve the UX for updating [Tracked Tables](https://docs.bemi.io/postgresql/source-database#tracking-by-tables) by warning about unsaved changes
  * Allow viewing full table & primary key values and copy them on click
  * Add an easy-to-copy PSQL command example
* Platform
  * Allow setting rules for [ignoring changes](https://docs.bemi.io/postgresql/source-database#ignoring-by-columns)
  * Add [connection pooling](https://docs.bemi.io/postgresql/destination-database#connection-pooling) to destination databases
  * Implement monitoring and alerting for customers' usage volumes
* Security
  * Implement [IP-based access control](https://docs.bemi.io/destination-database#ip-based-access-control) to destination databases
  * Always ask to specify a database password when editing a [Source Database connection](https://docs.bemi.io/source-database#connection)
  * Use internal network connection and DNS for all inter-service communication within VPC
* [Bemi Core](https://github.com/BemiHQ/bemi)
  * Improve PostgreSQL indexes
  * Use microsecond precision for timestamps
* [Bemi Prisma](https://github.com/BemiHQ/bemi-prisma)
  * Automatically include an original SQL query in the application context
  * Add support for Next.js actions
* [Bemi Rails](https://github.com/BemiHQ/bemi-rails)
  * Automatically include an original SQL query in the application context
  * Allow filtering out changes by a record, values, and operations
  * Add new helper methods for diffing and sorting changes
  * Filter out sensitive logs
* Integrations
  * [Render](https://docs.bemi.io/postgresql/source-database#render): create a dedicated integration runbook with their support
  * [Neon](https://docs.bemi.io/postgresql/source-database#neon): describe how to integrate by using their new Logical Replication beta feature
  * [Supabase](https://docs.bemi.io/postgresql/source-database#supabase): improve IPv6 error handling
  * [AWS DMS](https://aws.amazon.com/dms/): make ingestion worker compatible with DMS' logical replication decoding
