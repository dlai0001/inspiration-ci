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
  

  // socket is globalized by sails
  socket.get('/build',{}, function (response) {
    $scope.$apply(function() {
      // response === {success: true, message: 'hi there!'}
      console.log("socket response:", response);

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
      console.log("where's here", data);

      if(data.model === "build"){      
        
        var updatedBuildData = data.data;
        console.log("build update received:", updatedBuildData);

        updateClientSideModel($scope.allBuilds[updatedBuildData.id], updatedBuildData);

        //update runningBuilds
        if(updatedBuildData.state === "running") {
          console.log("checking if we have a running instance already:", $scope.runningBuilds[updatedBuildData.id]);
          if(typeof $scope.runningBuilds[updatedBuildData.id] == "undefined") {            
            console.log("detected a new running build.");
            $scope.runningBuilds[updatedBuildData.id] = updatedBuildData;
          }
          else {
            console.log("updating running build stats");
            updateClientSideModel($scope.runningBuilds[updatedBuildData.id], updatedBuildData);
          }
          
        } else {
          // build is no longer running.  removing it.
          delete $scope.runningBuilds[updatedBuildData.id];
        }

        // Make sure we always have at least 1 active running build.
        setTimeout(function(){
          if($('#running-build-carousel .item.active').length < 1) {
            try {
              $('#running-build-carousel .item:first').addClass('active');
            } catch(e) {
              //do nothing.
            }
          }
        }, 1000);
        

        if(updatedBuildData.status == "FAILURE") {
          if(typeof $scope.failingBuilds[updatedBuildData.id] == "undefined") {
            console.log("detected new failing build");
            $scope.failingBuilds[updatedBuildData.id] = updatedBuildData;
          } else {
            updateClientSideModel($scope.failingBuilds[updatedBuildData.id], updatedBuildData);
          }
        } else {
          delete $scope.failingBuilds[updatedBuildData.id];          
        }
        
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

function updateClientSideModel(clientModel, update) {
  for(var key in update) {
    clientModel[key] = update[key];
  }
}

//init carousels.
setTimeout(function(){
  $('#all-build-carousel').carousel({interval: 10000});   
  $('#running-build-carousel').carousel({interval: 10000});
}, 5000);
