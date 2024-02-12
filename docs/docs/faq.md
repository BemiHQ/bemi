# FAQ

### What does Bemi do when connecting to a database?

Bemi implements a design pattern called Change Data Capture (CDC) by connecting to a built-in replication log of a database, ingesting all changes on the database level, and storing them in a structured format in a destination database. Because data changes are tracked on the database level, it means that even unintended changes triggered by a direct SQL query will be captured ensuring 100% accuracy. The database connection details can be securely configured through our dashboard UI in a few seconds.

### What data does Bemi store and how can it be used?

Bemi worker automatically stitches low-level database changes with application-specific context and stores this information in a structured format. This allows making time travel queries to fetch historical records as of a specific timestamp in the past and easily group them, for example, to see all recent changes made by a user or revert all data changes made within an API request.

### How secure is the data and where is it stored?

We allow anyone to use our open-source libraries and store all data in any destination database, even the original one that produces data changes for simplicity.

For those who want to get instant value and avoid dealing with self-hosting and scalability issues, we offer a fully managed secured cloud solution that includes dedicated Bemi worker ingesters, queues for fault tolerance, automatically scaled destination databases of your choice, and enhanced UI with additional team features.

### Why do I need to install a package on the backend?

We recommend installing our open-source libraries on the backend to enhance low-level database changes and automatically pass application-specific context with these changes. For example, information about a user who made a change, an API endpoint where the change was triggered, a worker name that automatically triggered database changes, etc. We will publish our open-source packages for major backend frameworks soon. Sign up to be notified!

### How is it different from the existing ORM-related libraries for tracking changes?

They usually have some of the following disadvantages

* Missing capturing data changes made by direct SQL queries on the adapter level
* Adding additional runtime performance overhead by making extra database inserts in callbacks
* Storing changes in the same table, increasing the size and cost, and worsening the overall database performance
* Requiring writing lots of code boilerplate all over the codebase increasing the chances of introducing bugs
* Storing data changes in a hard-to-query serialized format
* Lacking the UI for troubleshooting and audit log purposes

See this [page](/alternatives) that summarizes the main differences between different alternative solutions.

### Why not just use logging solutions like DataDog and APM tools like New Relic?

These tools do not track changes made within a database. Bemi allows automatically tracking changes for each database record individually. This data represents an audit log which can be used for audit, digital forensics, and troubleshooting purposes.

### Is Bemi similar to ETL tools and warehouse solutions?

Bemi relies on similar techniques to capture data changes that can be used for moving data from the main source databases to data lakes for analytics purposes in real-time.

The main difference is that Bemi integrates not just on the database level, but also on the application level enhancing low-level data changes with not just information about “when” and “what” has changed, but also “where” (API endpoint, worker, and so on) and “who” made the change (user, cron job, and so on).

### Is Bemi like git for data and does it implement Event Sourcing?

Great question! Event Sourcing is a powerful pattern that captures state-changing events like git commits and allows deriving the state at any point in time, essentially enabling time travel.

Bemi allows to event-source any database. We take a practical approach without requiring to rearchitect the existing code, switch to highly specialized databases, or use unnecessary git-like abstractions. Just plug it into your database (a.k.a. projection in event sourcing) and start tracking all database state changes (a.k.a. event store in event sourcing).

### How can I self-host?

See this [docs page](/self-hosting).

### What does Bemi mean and how is it pronounced?

Bemi stands for "Beginner's Mindset". Bemi is pronounced like [be]nefits [me].
