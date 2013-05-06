var port = 3030,
    dbname = "feudal"

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    util = require('util'),
    ioserver = require('socket.io'),
    ioclient = require('socket.io-client'),
    workerio = null,
    EventEmitter = require('events').EventEmitter,
    _ = require('underscore')


var JobSchema = new Schema({
    handle: {type: String, required: true},
    priority: {type: Number, default: 0},
    data: Schema.Types.Mixed
  })
JobSchema.index({priority:-1})
var JobModel = mongoose.model('Job', JobSchema)


var Master = (function(){

  function Master (options) {
    console.log("Master is created")
  }

  util.inherits(Master, EventEmitter)
  sleepers = {}

  // 
  // Starts the job server by connceting to mongo and loading up any jobs.
  // 
  Master.prototype.start = function(callback){
    var self = this
    console.log("Starting master server")
    var io = ioserver.listen(port)

    io.sockets.on('connection', function (socket) {
      socket.job = null
      socket.ableto = []

      socket.on('job:done', function (from, msg) {
        console.log('I received a private message by ', from, ' saying ', msg)
      })

      //
      // WORKER REQUESTS A JOB
      socket.on('job:request', function (data) {
        if(!socket.job) {
          console.log(socket.id + " requesting job")

          self.findJob(socket.ableto, function(obj){
            if(!obj) {
              socket.emit( 'job:none' )
            } else {
              obj.remove( function(){
                self.giveJob(obj, socket)
              })
            }
          })
        } else {
          console.log("Worker requested job, but not finished current job")
        }
      })

      //
      // WORKER IS DONE A JOB
      socket.on('job:complete', function(data){
        console.log("Worker says job is complete", socket.job, data)
        socket.job = null
        self.emit('job:complete', data);
      })

      //
      // WORKER FAILED THE JOB
      socket.on('job:fail', function(){
        // Add it back into the queue.
        var failed_job = socket.job
        socket.job = null
        failed_job.save(function(err, d){
          self.emit('job:fail', failed_job)
        })
        
      })

      //
      // WORKER CAN DO THESE JOBS
      socket.on('worker:ableto', function(handle, max_time){
        socket.ableto.push(handle)
      })

      //
      // WORKER IS SLEEPING
      socket.on('worker:sleep', function(){
        // First check to see if this worker can do a job available
        // if not, sleep
        self.findJob(socket.ableto, function(obj){
          if(obj) {
            obj.remove( function(){
                self.giveJob(obj, socket)
              })
          } else {
            if(!_.has(sleepers, socket.id)) {
              sleepers[socket.id] = socket
            }
          }
        })
      })

      // WORKER HAS DISCONNECTED
      socket.on('disconnect', function () {
        io.sockets.emit('user disconnected')
      });

    });


    db = mongoose.connection
    db.on('open', function(){

      callback()
    })
    db.on('error', function(){
      callback("Error connecting to mongo")
    })

    mongoose.connect('mongodb://localhost/'+dbname)

  }

  // 
  // Find a job for the socket
  // consider making this overwriteable, so the jobs can be
  // retrieved from any source?
  // 
  Master.prototype.findJob = function(handles, callback) {
    console.log("trying to find a job")
    JobModel.find({handle:handles})
      .sort({priority:1})
      .limit(1)
      .exec(function(err, obj){
        callback(obj[0])
      })
    // JobModel.findOne({ handle:handles }, {}, {sort:{priority:-1}})
    //   .exec(function(err, obj){
    //     callback(obj)      
    //   })
  }

  // 
  // Adds a new job to the collection
  // 
  Master.prototype.addJob = function(handle, data, priority){
    var self = this
    var new_job_obj = {
      'handle': handle,
      'data': data
    }
    if(priority != undefined)
      new_job_obj['priority'] = priority

    var new_job = new JobModel(new_job_obj)

    var gave_away = false
    // See if a sleeping worker would like this job and bypass the insert
    _.each(sleepers, function(v,k){
      if(!gave_away && _.indexOf(v.ableto, handle) > -1) {
        gave_away = true
        self.giveJob(new_job, v)
        // if(callback) callback()
      }
    })

    if(gave_away) return
    new_job.save(function(err,doc){
      // if(callback) callback()
    })
  }


  // 
  // Give a job to a worker
  // 
  Master.prototype.giveJob = function(job, worker){
    worker.job = job
    if(_.has(sleepers, worker.id)) {
      delete sleepers[worker.id]
    } 
    worker.emit( 'job:assign', job )  
  }

  // 
  // Clear all the jobs from the queue
  // 
  Master.prototype.clearJobs = function(callback){
    JobModel.remove({}, function(){
      if(callback)
        callback()
    })
  }

  // 
  //  gets the next job from the collection
  // 
  Master.prototype.getJob = function(callback){
    console.log("Getting a job")
  }

  //
  // Gets job count
  // 
  Master.prototype.getJobCount = function(handle, callback){
    var query = {}
    if(typeof handle === "function" && !callback) {
      callback = handle
    } else {
      query['handle'] = handle
    }
    JobModel.count(query,function(err, count){
      callback(c)
    })
  }

  // 
  //  Status check
  // 
  Master.prototype.status = function(callback){
    // for each socket
    // 
  }

  return Master
})()



//
// WORKER
// 
// 
var Worker = (function(){

  function Worker (options){
    console.log("Worker is created")
  }
  util.inherits(Worker, EventEmitter)

  // 
  // Connects to the Master
  // 
  Worker.prototype.connect = function(callback){
    var self = this
    workerio = ioclient.connect('http://localhost:' + port, { reconnect: false });

    // Worker connected
    workerio.on('connect', function(socket) { 
      callback()
    })

    workerio.on('disconnect', function(){
      self.emit('disconnect')
    })

    // Worker gets a job
    workerio.on('job:assign', function(job){
      self.emit('job:assign', job)
    })

    // TOOD: Worker is told there are no jobs
    workerio.on('job:none', function(){
      self.emit('job:none')
    })

    // TOOD: Worker is told to die
    workerio.on('die', function(job){
      console.log("Worker was told to die")
      process.exit(0)
    })

  }

  Worker.prototype.reconnect = function(){
    
  }

  Worker.prototype.complete = function(data){
    workerio.emit('job:complete', data)
  }

  Worker.prototype.fail = function(){
    workerio.emit('job:fail')
  }

  Worker.prototype.requestJob = function(){
    workerio.emit('job:request')
  }

  Worker.prototype.ableTo = function(job_name, max_time){
    workerio.emit('worker:ableto', job_name, max_time)
  }

  Worker.prototype.sleep = function(){
    console.log("Zzz...")
    workerio.emit('worker:sleep')
  }

  Worker.prototype.setName = function(new_worker_name){
    workerio.emit('worker:setname', new_worker_name)
  }

  Worker.prototype.close = function(){
    workerio.disconnect()
  }

  return Worker
})()


exports.Master = function(){ return new Master() }
exports.Worker = function(){ return new Worker() }