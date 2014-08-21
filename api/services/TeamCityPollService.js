
var teamCityConfig = require('../../config/teamcity').teamcity;

var Deferred = require("promised-io/promise").Deferred;
var resolveAll = require("promised-io/promise").all;

var debounce = require('debounce');

var rest = require('restler'); //lib to do rest requests.

var moment = require('moment');

var compareVersion = require('../../helpers/utilities').compareVersion;


module.exports = {
	init: function() {
		console.log("Initializing team city update service.");

		var modelCleanUpTask = new Deferred();
		//Drop existing models.
		buildModelCleanup(function(){
			modelCleanUpTask.resolve();
		});

		var processAllBuildTypesTask = new Deferred();
		modelCleanUpTask.then(function(){
			console.log("Processing builds list.");
			
			//Get build types.
			var buildTypesRestApiUrl = teamCityConfig.apiUrl + "/buildTypes";		
			rest.get(buildTypesRestApiUrl).on('complete', function(data){

				for(var i=0; i < data.buildTypes.buildType.length; i++) {
					var buildTypeEntry = data.buildTypes.buildType[i].$;				

					Build.create({
						id: buildTypeEntry.id,
						name: buildTypeEntry.name,
						project: buildTypeEntry.projectName,
						webUrl: buildTypeEntry.webUrl,
						state: 'UNKNOWN',
						status: 'UNKNOWN',
						lastUpdated: new Date(0)
					}).exec(function(err, model){});
				}

				processAllBuildTypesTask.resolve();
			});		
		});

		//Task to iterate through each buildtype.
		var doneProcessingAllProjectsTask = new Deferred();
		processAllBuildTypesTask.then(function() {
			console.log("Fetching project statuses");
			Build.find().exec(function(err, buildModels){

				for(var i=0; i < buildModels.length; i++) {
					(function(currentBuildModel){
						updateBuildStatusForBuild(currentBuildModel);					
					})(buildModels[i]);
				}
				
				doneProcessingAllProjectsTask.resolve();
			});
		
		});


		doneProcessingAllProjectsTask.then(function() {
			console.log("starting polling interval task.");
			
			setupProjectUpdatePolling();
		});
	}
}




function setupProjectUpdatePolling() {
	var lastBuildId = -1; //Track the last build we queried.
	setInterval(function(){	

		//Query for running builds		
		pollRunningProjects().then(function(){
			pollRecentlyCompleted(lastBuildId).then(function(buildId) {
				lastBuildId = buildId;
			});
		});

	}, 5000); // On 5 second intervals.
}


function pollRunningProjects() {
	var promise = new Deferred();
	var queryRunningBuilds = teamCityConfig.apiUrl + "/builds?locator=running:true";
	rest.get(queryRunningBuilds).on('complete', function(data){				
		console.log("checking builds in progress:", data);

		// It was observed that sometimes returned data does not contain
		// results in expected format.
		try {
			if(parseInt(data.builds.$.count) <= 0) {
				console.log("no build in progress");								
				promise.resolve();
				return;
			} else {
				// Let's debounce a running builds cleanup so we run it after all 
				// running builds disappears.
				scheduleCleanUpOldRunningBuilds();
			}
		} catch(e) {
			//Occasionally TeamCity performs a cleanup task which causes the call above
			// not to respond.
			console.log("error checking builds in progress:", e);
			return; 
		}

		var promiseArray = [];
		
		for(var i=0; i < data.builds.build.length; i++) {					
			(function(currentBuild){
				var updatePromise = new Deferred();
				promiseArray.push(updatePromise);

				console.log("current build in progress", currentBuild);
				Build.findOne({id:currentBuild.buildTypeId}).exec(function(err, foundModel){
					updateModel(foundModel, currentBuild, function(){
						updatePromise.resolve();
					});
				});

			})(data.builds.build[i].$);
		}

		//Wait for all updates to complete before continuing.
		resolveAll(promiseArray).then(function(){
			console.log("Update running projects complete.");
			promise.resolve();
		});				
	}); //end running builds query	
	return promise;
}


function pollRecentlyCompleted(lastBuildId) {
	var promise = new Deferred();

	var lastcompletedBuildsQuery = teamCityConfig.apiUrl + "/builds?count=20";
	if(lastBuildId > 0) {
		lastcompletedBuildsQuery = teamCityConfig.apiUrl + "/builds?locator=canceled:any,sinceBuild(id:" + lastBuildId +")";
	}

	console.log("checking last builds: ", lastcompletedBuildsQuery);
	rest.get(lastcompletedBuildsQuery).on('complete', function(data){
		
		if(data.builds.$.count == 0) {
			console.log("no new updates in recently complated projects");
			promise.resolve(lastBuildId);
			return;
		}

		console.log("Found recently complated projects.");

		//track processed projects so we don't overwrite a more recent result with an older one.
		var processedProjects = {};

		// For each build we see in our updates.
		for(var i=0; i < data.builds.build.length; i++) {
			(function(currentBuild){

				//skip processing if we have already processed it.
				if(processedProjects[currentBuild.buildTypeId] == true)
					return;

				Build.findOne({id:currentBuild.buildTypeId}).exec(function(err, foundModel){
					processedProjects[foundModel.id] = true;
					
					// if we have newer info than the one we fetched.
					// (this can happen during initializating.)
					if( foundModel.version != null && compareVersion(currentBuild.number, foundModel.version) < 0)						
						return;

					updateModel(foundModel, currentBuild);					
				});
				
			})(data.builds.build[i].$);
		}

		//Call back using last build id to alert the caller for tracking last build.
		promise.resolve(data.builds.build[0].$.id);
	}); // end last builds query
	
	return promise;
}

function updateModel(buildModel, updatedData, callback) {
	console.log("updating build model for build", buildModel.name);
	buildModel.status = updatedData.status;
	buildModel.state = updatedData.state;								
	buildModel.version = updatedData.number;
	buildModel.webUrl = updatedData.webUrl;
	buildModel.lastUpdated = new Date();							
	buildModel.percentComplete = updatedData.percentageComplete;
	buildModel.save(function(err, savedModel) {
		console.log("model saved, publishing", savedModel);
		Build.publishUpdate(savedModel.id, savedModel);
	});

	if(callback) {
		callback();
	}
}

function buildModelCleanup(callback) {
	Build.destroy().exec(function(err, builds){
		if(err) {
			console.log('server error destroying models.');			
		}
		console.log('cleaning out models complete.', builds);
		console.log('reading teamcity configs', teamCityConfig);
		callback();
	});
}

function updateBuildStatusForBuild(currentBuildModel, callback) {
	var getBuildStatusUrl =  teamCityConfig.apiUrl 
		+ "/buildTypes/" + currentBuildModel.id
		+ "/builds?count=1";

	rest.get(getBuildStatusUrl).on('complete', function(data){
		if (data.builds.$.count !== '0') {
            var lastBuildOfProject = data.builds.build[0].$;
            updateModel(currentBuildModel, lastBuildOfProject);
        }

	});

	if(callback)
		callback();
}

var scheduleCleanUpOldRunningBuilds = debounce(function cleanUpOldRunningBuilds() {

	console.log("Cleaning up running builds");
	Build.find({state:'running'}).exec(function(err, buildModels){
		for(var i=0; i < buildModels.length; i++) {
			(function(currentBuildModel){
				console.log("running builds cleanup updated", currentBuildModel);
				updateBuildStatusForBuild(currentBuildModel);					
			})(buildModels[i]);
		}		
	});
},20000);

function savePubBuildModel(buildModel) {
	buildModel.save(function(err, savedModel) {
		console.log("model saved, publishing", savedModel);
		Build.publishUpdate(savedModel.id, savedModel);
	});
}