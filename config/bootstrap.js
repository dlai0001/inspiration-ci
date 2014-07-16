/**
 * Bootstrap
 *
 * An asynchronous boostrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * http://sailsjs.org/#documentation
 */

var teamCityConfig = require('./teamcity').teamcity;
var Deferred = require("promised-io/promise").Deferred;
var rest = require('restler'); //lib to do rest requests.
var moment = require('moment');
var compareVersion = require('../helpers/utilities').compareVersion;


module.exports.bootstrap = function (cb) {

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
					var getBuildStatusUrl =  teamCityConfig.apiUrl 
						+ "/buildTypes/" + currentBuildModel.id 
						+ "/builds?count=1";

					rest.get(getBuildStatusUrl).on('complete', function(data){
						var lastBuildOfProject = data.builds.build[0].$;
						updateModel(currentBuildModel, lastBuildOfProject);
					});
				})(buildModels[i]);
			}
			
			doneProcessingAllProjectsTask.resolve();
		});
	
	});


	doneProcessingAllProjectsTask.then(function() {
		console.log("starting polling interval task.");
		
		setupProjectUpdatePolling();
	});
	

  	// It's very important to trigger this callack method when you are finished 
  	// with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  	cb();
};


function setupProjectUpdatePolling() {
	var lastBuildId = -1;
	setInterval(function(){	

		//Query for running builds
		var runningBuildsQueryTask = new Deferred();
		pollRunningProjects(function(){
			runningBuildsQueryTask.resolve();
		});


		//Query for last X completed builds"
		runningBuildsQueryTask.then(function(){
			pollRecentlyCompletedAndReturnLastBuildId(lastBuildId, function(buildId) {
				lastBuildId = buildId;
			});
		});
	}, 5000); // On 5 second intervals.
}

function pollRunningProjects(callback) {
	var queryRunningBuilds = teamCityConfig.apiUrl + "/builds?locator=running:true";
	rest.get(queryRunningBuilds).on('complete', function(data){				
		console.log("checking builds in progress:", data.builds.$.count);
		if(parseInt(data.builds.$.count) <= 0) {
			console.log("no build in progress");
			callback();
			return;
		}
		
		for(var i=0; i < data.builds.build.length; i++) {					
			(function(currentBuild){					

				console.log("current build in progress", currentBuild);
				Build.findOne({id:currentBuild.buildTypeId}).exec(function(err, foundModel){
					updateModel(foundModel, currentBuild);
				});

			})(data.builds.build[i].$);
		}
		callback();
	}); //end running builds query	
}


function pollRecentlyCompletedAndReturnLastBuildId(lastBuildId, callback) {
	var lastcompletedBuildsQuery = teamCityConfig.apiUrl + "/builds?count=20";
	if(lastBuildId > 0) {
		lastcompletedBuildsQuery = teamCityConfig.apiUrl + "/builds?locator=sinceBuild(id:" + lastBuildId +")";
	}

	console.log("checking last builds: ", lastcompletedBuildsQuery);
	rest.get(lastcompletedBuildsQuery).on('complete', function(data){
		
		if(data.builds.$.count == 0) {
			console.log("no new updates");
			return lastBuildId;
		}
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
					if( foundModel != null && !compareVersion(currentBuild.number, foundModel.version))
						return;

					// If model is mostly unchanged, don't bother updating.
					if( foundModel.status == currentBuild.status &&
							foundModel.state == currentBuild.state &&
							foundModel.version == currentBuild.number)
						return;

					updateModel(foundModel, currentBuild);
					
				});
				
			})(data.builds.build[i].$);
		}

		//Call back using last build id to alert the caller for tracking last build.
		callback(data.builds.build[0].$.id);
	}); // end last builds query
}

function updateModel(buildModel, updatedData) {
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