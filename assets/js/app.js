/**
 * app.js
 *
 * This file contains some conventional defaults for working with Socket.io + Sails.
 * It is designed to get you up and running fast, but is by no means anything special.
 *
 * Feel free to change none, some, or ALL of this file to fit your needs!
 */


(function (io) {

  // as soon as this file is loaded, connect automatically, 
  var socket = io.connect();
  if (typeof console !== 'undefined') {
    log('Connecting to Sails.js...');
  }

  // Simple log function to keep the example simple
  function log () {
    if (typeof console !== 'undefined') {
      console.log.apply(console, arguments);
    }
  }

  socket.on('connect', function socketConnected() {

    // Listen for Comet messages from Sails
    socket.on('message', function messageReceived(message) {

      ///////////////////////////////////////////////////////////
      // Replace the following with your own custom logic
      // to run when a new message arrives from the Sails.js
      // server.
      ///////////////////////////////////////////////////////////
      log('New comet message received :: ', message);
      //////////////////////////////////////////////////////

    });



    ///////////////////////////////////////////////////////////
    // Here's where you'll want to add any custom logic for
    // when the browser establishes its socket connection to 
    // the Sails.js server.
    ///////////////////////////////////////////////////////////
    log(
        'Socket is now connected and globally accessible as `socket`.\n' + 
        'e.g. to send a GET request to Sails, try \n' + 
        '`socket.get("/", function (response) ' +
        '{ console.log(response); })`'
    );
    ///////////////////////////////////////////////////////////

  });


  // Expose connected `socket` instance globally so that it's easy
  // to experiment with from the browser console while prototyping.
  window.socket = socket;

})(

  // In case you're wrapping socket.io to prevent pollution of the global namespace,
  // you can replace `window.io` with your own `io` here:
  window.io

);

function updateTestStatus($scope) {
  console.log("updating test state and status");
  
  if(Object.keys($scope.runningBuilds).length == 0) {
    $scope.testsRunning = false;
  } else {
    $scope.testsRunning = true;
  }

  if(Object.keys($scope.failingBuilds).length == 0) {
    $scope.testsPassed = true;
  } else {
    $scope.testsPassed = false;
  }
  
}

// Add our main window after socket io has been initialized.
window.MainCtrl = function($scope) {

  $scope.testsPassed = true;
  $scope.testsRunning = false;
  $scope.inspirationalPic = "/images/success/success3.jpg";
  
  $scope.runningBuilds = {};
  $scope.failingBuilds = {};
  $scope.allBuilds = {};
  

  // socket is globalized by sails
  socket.get('/build',{}, function (response) {
    $scope.$apply(function() {
      // response === {success: true, message: 'hi there!'}
      console.log("socket response:", response);

      //create build models in an indexed array.
      for(var i=0; i < response.length; i++) {
        var buildInfo = response[i];
        $scope.allBuilds[buildInfo.id] = buildInfo;

        if(buildInfo.status !== "SUCCESS") {
          $scope.failingBuilds[buildInfo.id] = buildInfo;
        }

        if(buildInfo.state === "running") {
         $scope.runningBuilds[buildInfo.id] = buildInfo; 
        }
      }
      updateTestStatus($scope); 
    });   
  });

  socket.on("message", _.bind(function(data){
    $scope.$apply(function() {

      // Update our scope with our updated model.
      console.log("where's here", data);

      if(data.model === "build"){      
        
        var updatedBuildData = data.data;
        console.log("build update received:", updatedBuildData);

        $scope.allBuilds[updatedBuildData.id] = updatedBuildData;

        //update runningBuilds
        if(updatedBuildData.state === "running") {
          if(typeof $scope.runningBuilds[updatedBuildData.id] == "undefined") {
            console.log("detected a new running build.");
            $scope.runningBuilds[updatedBuildData.id] = updatedBuildData;
            $scope.$digest();
          }
          else {
            console.log("updating running build stats");
            $scope.runningBuilds[updatedBuildData.id].version = updatedBuildData.version;
            $scope.runningBuilds[updatedBuildData.id].state = updatedBuildData.state;
            $scope.runningBuilds[updatedBuildData.id].status = updatedBuildData.status;
            $scope.runningBuilds[updatedBuildData.id].percentComplete = updatedBuildData.percentComplete; 
          }

          if($('#running-build-carousel .item.active').length < 1) {
            $('#running-build-carousel .item:first').addClass('active');
          }
        } else {
          delete $scope.runningBuilds[updatedBuildData.id];
          $scope.$digest();
        }

        if(updatedBuildData.status !== "SUCCESS") {
          $scope.failingBuilds[updatedBuildData.id] = updatedBuildData;
          $scope.$digest();
        } else {
          delete $scope.failingBuilds[updatedBuildData.id];
          $scope.$digest();
        }
        
        updateTestStatus($scope);              
      
      } //end if 'build'
    });
  }, this)); //end of handling build updates.


  //change inspirational image every 30 seconds.
  setInterval(function(){
    $scope.$apply(function(){
      updateInspirationalPoster($scope);
    });    
  }, 30000);

};

function updateInspirationalPoster($scope){
  console.log("updating inspirational image");
  socket.get('/images',{}, function (response) {
      $scope.$apply(function() {
      var randomIndex = Math.floor(Math.random() * response.successImages.length);
      var newInspirationalImg = response.successImages[randomIndex];
      $scope.inspirationalPic = newInspirationalImg;
    });
  });
}

//init carousels.
$(document).ready(function(){  
  $('#all-build-carousel').carousel({interval: 10000});   
  $('#running-build-carousel').carousel({interval: 10000});
});