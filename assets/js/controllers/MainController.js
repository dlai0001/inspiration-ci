
window.MainCtrl = function($scope) {

  
  $scope.testsPassed = true;
  $scope.testsRunning = false;
  $scope.inspirationalPic = "/images/success/success3.jpg";
  
  $scope.allBuilds = [];
    

  log("getting initial project statuses");
  socket.get('/build',{}, function (response) {    
    $scope.$apply(function() {

      for(var i=0; i < response.length; i++) {
        var buildInfo = response[i];
        updateModelsWithBuildStatus(buildInfo, $scope);
      }

      updateTestStatus($scope); 
    });   
  });


  // process socket messages.
  socket.on("message", _.bind(function(data){
    $scope.$apply(function() {

      if(data.model === "build"){              
        var updatedBuildData = data.data;
        processBuildEntryUpdate(updatedBuildData, $scope)                  
      }

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


function processBuildEntryUpdate(updatedBuildData, $scope) {
  log("build update received:", updatedBuildData);        
  updateModelsWithBuildStatus(updatedBuildData, $scope);
  updateTestStatus($scope);
  runningbuildsCarouselMaintainenceTask();
}

function updateTestStatus($scope) {
  log("updating test state and status");
  var countRunningBuilds = $.grep($scope.allBuilds, function(item){
    return item.state === "running";
  }).length;
  $scope.testsRunning = countRunningBuilds > 0;

  var countFailingBuilds = $.grep($scope.allBuilds, function(item){
    return item.status === "FAILURE";
  }).length;
  $scope.testsPassed = countFailingBuilds == 0;  
}


function updateInspirationalPoster($scope){
  log("updating inspirational image");
  // Gets a random image from our list of success images, and sets the url.
  socket.get('/images',{}, function (response) {
    $scope.$apply(function() {
      var randomIndex = Math.floor(Math.random() * response.successImages.length);
      var newInspirationalImg = response.successImages[randomIndex];
      $scope.inspirationalPic = newInspirationalImg;
    });
  });
}

function updateClientSideModel(clientModel, update) {
  // updates single model by updating all the keyvalues in that model.
  for(var key in update) {
    clientModel[key] = update[key];
  }
}

function updateModelsWithBuildStatus(update, $scope) {
  // query to see if we can find a model with matching build.id
  var queryTargetModelResults = $.grep($scope.allBuilds, function(currentItem) {
    return currentItem.id === update.id;
  });
  
  if(queryTargetModelResults.length>0) {
    // Check if model already exists, update it.
    updateClientSideModel(queryTargetModelResults[0], update);
  } else {
    // if not, push a new model.
    $scope.allBuilds.push(update);
  }
}

//init carousels. - setting init in the future to give models to load 
// before starting the carousels.
setTimeout(function(){
  $('#all-build-carousel').carousel({interval: 10000});   
  $('#running-build-carousel').carousel({interval: 10000});
}, 5000);


function runningbuildsCarouselMaintainenceTask() {  
  // Make sure we always have at least 1 active running build.
  // so not to break the bootstrap carousel.
  setTimeout(function(){
    if($('#running-build-carousel .item.active').length < 1) {
      try {
        // try to repair the carousel's state by adding an active item and resetting it.
        $('#running-build-carousel .item:first').addClass('active');
        $("#running-build-carousel").carousel("pause").removeData();
        $("#running-build-carousel").carousel("cycle");
      } catch(e) {
        //do nothing.
      }
    }
  }, 1000);  
}