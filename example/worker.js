var worker = require('../feudal').Worker()

// Handle a job assignment
worker.on( 'job:assign', function(job){
  setTimeout(function(){
    var msg = "I waited " + job.data.delay + " to eat " + job.data.food
    console.log(msg)
    worker.complete({
      message: msg
    })
    worker.requestJob()
  }, job.data.delay)

})

// Handle no jobs by going to sleep
worker.on( 'job:none', function(){
  console.log("looks like there are no jobs left, folks.")
  worker.sleep()
})

// Connecting to the Master
worker.connect( function(err){
  console.log("Connected to the master")
  worker.ableTo("eat")
  worker.requestJob()
})
