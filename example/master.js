var master = require('../feudal').Master()

// Respond to completed jobs
master.on('job:complete', function(job){
  console.log('This job completed:', job)
  // Save the results or something?
})

// Start up the master!
master.start(function(err){
  master.clearJobs()

  setTimeout(function(){

    var foods = ["burrito","pizza","sandwich","samosa","burger","stir fry","sushi","barbecue"]
    for (var i = 0; i < foods.length; i++) {
      var priority = 0
      if (foods[i] === "samosa") priority = 5
      master.addJob('eat', {
        delay: Math.round(Math.random()* (3000 - 500 + 1) + 500),
        food:foods[i]
      }, priority)
      console.log("Added some jobs")
    }

  }, 10000)
  console.log("The master is running, ready for workers.")
})