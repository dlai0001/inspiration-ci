/**
 * app.js
 *
 * This file contains some conventional defaults for working with Socket.io + Sails.
 * It is designed to get you up and running fast, but is by no means anything special.
 *
 * Feel free to change none, some, or ALL of this file to fit your needs!
 */


function log () {
  if (typeof console !== 'undefined') {
    console.log.apply(console, arguments);
  }
}

(function (io) {

  // as soon as this file is loaded, connect automatically, 
  var socket = io.connect();


  // Expose connected `socket` instance globally so that it's easy
  // to experiment with from the browser console while prototyping.
  window.socket = socket;

})(

  // In case you're wrapping socket.io to prevent pollution of the global namespace,
  // you can replace `window.io` with your own `io` here:
  window.io

);


// Add our main window after socket io has been initialized.
window.MainCtrl = function($scope) {

  $scope.testsPassed = true;
  $scope.testsRunning = false;
  $scope.inspirationalPic = "/images/success/success3.jpg";
  
  $scope.runningBuilds = {};
  $scope.failingBuilds = {};
  $scope.allBuilds = {};
  

  log("getting initial project statuses");
  socket.get('/build',{}, function (response) {    
    $scope.$apply(function() {
      log("socket response:", response);

      //create build models in an indexed array.
      for(var i=0; i < response.length; i++) {
        var buildInfo = response[i];
        $scope.allBuilds[buildInfo.id] = buildInfo;

        if(buildInfo.status == "FAILURE") {
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
      log("where's here", data);

      if(data.model === "build"){      
        
        var updatedBuildData = data.data;
        log("build update received:", updatedBuildData);        

        //update models in all arrays which the build already exists.
        [$scope.allBuilds, $scope.runningBuilds, $scope.failingBuilds].forEach(function(buildArray){
          if(buildArray[updatedBuildData.id]) {
            updateClientSideModel(buildArray[updatedBuildData.id], updatedBuildData);
          }
        });

        // handle running build.
        if(updatedBuildData.state === "running") {          
          if(typeof $scope.runningBuilds[updatedBuildData.id] == "undefined") {            
            log("detected a new running build.");
            $scope.runningBuilds[updatedBuildData.id] = updatedBuildData;
          }
        } else { //build is not running.

          // build is no longer running.  removing it from running builds.
          if($scope.runningBuilds[updatedBuildData.id]) {
            log("removing build from running list:", updatedBuildData);
            delete $scope.runningBuilds[updatedBuildData.id];
          }

          // handling processing pass/fail state.
          if(updatedBuildData.status == "FAILURE") {
            if(typeof $scope.failingBuilds[updatedBuildData.id] == "undefined") {
              log("detected new failing build");
              $scope.failingBuilds[updatedBuildData.id] = updatedBuildData;
            } 
          } else {
            if($scope.failingBuilds[updatedBuildData.id]) {
              log("removing no longer failing build from failures list", updatedBuildData);
              delete $scope.failingBuilds[updatedBuildData.id];
            }            
          }
        }

        // Make sure we always have at least 1 active running build.
        // so not to break the bootstrap carousel.
        setTimeout(function(){
          if($('#running-build-carousel .item.active').length < 1) {
            try {
              $('#running-build-carousel .item:first').addClass('active');
            } catch(e) {
              //do nothing.
            }
          }
        }, 1000);        
        
        updateTestStatus($scope);              
      
      } //end if 'build'
    });
    $scope.$digest();
  }, this)); //end of handling build updates.


  //change inspirational image every 30 seconds.
  setInterval(function(){
    $scope.$apply(function(){
      updateInspirationalPoster($scope);
    });    
  }, 30000);

};


function updateTestStatus($scope) {
  log("updating test state and status");
  
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


function updateInspirationalPoster($scope){
  log("updating inspirational image");
  socket.get('/images',{}, function (response) {
      $scope.$apply(function() {
      var randomIndex = Math.floor(Math.random() * response.successImages.length);
      var newInspirationalImg = response.successImages[randomIndex];
      $scope.inspirationalPic = newInspirationalImg;
    });
  });
}

function updateClientSideModel(clientModel, update) {
  for(var key in update) {
    clientModel[key] = update[key];
  }
}

//init carousels. - setting init in the future to give models to load 
// before starting the carousels.
setTimeout(function(){
  $('#all-build-carousel').carousel({interval: 10000});   
  $('#running-build-carousel').carousel({interval: 10000});
}, 5000);
