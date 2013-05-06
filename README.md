# Feudal
============

A lighter master/worker job management library where the master also functions as the job server. Currently just kind of a concept I'm testing in place of a current Gearman solution.

I built it after constantly getting annoyed with Gearman and realizing I didn't have need for its multi-client or multi-job-server abilities.

Feudal currently stores jobs in a mongodb collection. The master handles job logistics such as creation, completion, and dispersement. Workers connect to the master via sockets. The worker count limit is dependent on the size of the master server and its ability to handle concurrent connections.

It's a super-early version, with a bunch of unimplemented or half-implemented features.

## Features
============

TODO... write these

### A Brief Example

Check the example directory for more thorough examples.

### Master
```javascript
master = require('feudal').Master()

// Respond to completed jobs
master.on('job:complete', function(job){
  console.log('This job completed:', job)
  // Save the results or something?
})

// Start up the master!
master.start(function(err){
  console.log("The master is running, ready for workers!")
})
```


### Workers
```javascript
worker = require('feudal').Worker()

// Receive a job to do
worker.on( 'job:assign', function(job){
  // Do some work based on the job assigned
  worker.complete( {message: "I did the job"} )
  worker.sleep()
})

// Connecting to the Master
worker.connect( function(err){
  worker.ableTo("eat")
  worker.requestJob()
})
```

## Jobs
============
Jobs can be added using `master.addJob(handle, job_data, [priority])` or by populating the jobs collection remotely or manually. Sleeping workers will only be woken when using the library, however if the master has no active workers, it will check for jobs every minute.

### Schema
+ `handle` **String** - Used to distinguish job types.
+ `data` **Object** - Whatever you need it to be.
+ `priority` **Number** - Optional, defaults to `0`. Numbers higher and lower dictate the prioritization respectively when jobs are requested by clients.


## TODO
============
### Master
+ Status check, poll all workers, get number working, maybe progress
+ Handle db errors
+ Built-in logging with configurable transports
+ Handle job timeouts. Workers can specify their max time to perform a job.
+ Check for jobs in the db once per minute if idle, in case added manually.
+ Add ability to override db storage with alternate?

### Worker
+ Add ability to remove jobs the worker can do.
+ store progress of job
