# Alternatives

## PostgreSQL data change tracking

Below is a summary that compares the alternatives:

* [PostgreSQL triggers](https://wiki.postgresql.org/wiki/Audit_trigger)
* Application-level tracking ([paper_trail](https://github.com/paper-trail-gem/paper_trail) in Ruby, [django-simple-history](https://github.com/jazzband/django-simple-history) in Python, etc.)
* Change Data Capture ([debezium](https://debezium.io/) written in Java, [pgcapture](https://github.com/replicase/pgcapture) written in Go, etc.)
* [PgAudit](https://www.pgaudit.org/) extension

|                                   | [Bemi Cloud](https://bemi.io/) | PG Triggers | App Tracking | Change Data Capture | PgAudit Logs |
|-----------------------------------|--------------------------------|--------------|-------------|---------------------|--------------|
| PostgreSQL data change tracking   | ✅                             | ✅           | ✅          | ✅                  | ❌           |
| SQL commands tracking             | ✅                             | ✅           | ❌          | ❌                  | ✅           |
| Reliable tracking accuracy        | ✅                             | ✅           | ❌          | ✅                  | ✅           |
| No runtime performance impact     | ✅                             | ❌           | ❌          | ✅                  | ✅           |
| Separate scalable storage         | ✅                             | ❌           | ❌          | ✅                  | ❌           |
| App context (user, API req, etc.) | ✅                             | ❌           | ✅          | ❌                  | ❌           |
