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

function compareVersion(versionA, versionB) {
	verAParts = versionA.split('.');
	verBParts = versionB.split('.');

	for(var i=0; i > verAParts.length; i++) {
		var diff = parseInt(verAParts[i]) - parseInt(verBParts[i]);
		if (diff != 0) {
			return diff;
		}
	}

	return 0;
}


module.exports.bootstrap = function (cb) {

	var modelCleanUpTask = new Deferred();
	//Drop existing models.
	Build.destroy().exec(function(err, builds){
		if(err) {
			console.log('server error destroying models.');			
		}
		console.log('cleaning out models complete.', builds);
		console.log('reading teamcity configs', teamCityConfig);
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
					var getBuildStatusUrl =  teamCityConfig.apiUrl + "/buildTypes/" + currentBuildModel.id + "/builds?count=1";

					rest.get(getBuildStatusUrl).on('complete', function(data){					
						var currentProjectinfo = data.builds.build[0].$;
						currentBuildModel.status = currentProjectinfo.status;
						currentBuildModel.state = currentProjectinfo.state;
						currentBuildModel.version = currentProjectinfo.number;
						currentBuildModel.lastUpdated = new Date();
						currentBuildModel.save(function(){});
					});
				})(buildModels[i]);
			}
			
			doneProcessingAllProjectsTask.resolve();
		});
	
	});


	doneProcessingAllProjectsTask.then(function() {
		console.log("starting polling interval task.");
		var iteration = 0;
		setInterval(function(){			
			//tracked processed projects so we don't update too often.
			var processedProjects = {};

			//Query for running builds
			var queryRunningBuilds = teamCityConfig.apiUrl + "/builds?locator=running:true";
			rest.get(queryRunningBuilds).on('complete', function(data){				
				console.log("checking builds in progress:", data.builds.$.count);
				if(parseInt(data.builds.$.count) <= 0) {
					console.log("no build in progress");
					return;
				}

				console.log(data.builds.build);
				for(var i=0; i < data.builds.build.length; i++) {					
					(function(currentBuild){					
						
						processedProjects[currentBuild.buildTypeId]	= true;

						console.log("current build in progress", currentBuild);
						Build.findOne({id:currentBuild.buildTypeId}).exec(function(err, foundModel){
							foundModel.status = currentBuild.status;
							foundModel.state = currentBuild.state;
							foundModel.version = currentBuild.number;
							foundModel.percentComplete = currentBuild.percentageComplete;
							foundModel.webUrl = currentBuild.webUrl;
							foundModel.save(function(err, savedModel) {
								console.log("saving model for build in progress", savedModel);
								Build.publishUpdate(savedModel.id, savedModel);
							});
						});
					})(data.builds.build[i].$);
				}
			});

			//Query for last X completed builds"
			var lastcompletedBuildsQuery = teamCityConfig.apiUrl + "/builds?count=10";
			rest.get(lastcompletedBuildsQuery).on('complete', function(data){
				
				for(var i=0; i < data.builds.build.length; i++) {
					(function(currentBuild){

						//skip processing if we have already processed it.
						if(processedProjects[currentBuild.buildTypeId] != true) {

							Build.findOne({id:currentBuild.buildTypeId}).exec(function(err, foundModel){
								processedProjects[foundModel.id] = true;
								
								if(compareVersion(currentBuild.number, foundModel.version) >= 0) {									
								
									if( foundModel.status != currentBuild.status ||
										foundModel.state != currentBuild.state ||
										foundModel.version != currentBuild.number) {

										console.log("updating build model for build", foundModel.name);
										foundModel.status = currentBuild.status;
										foundModel.state = currentBuild.state;								
										foundModel.version = currentBuild.number;
										foundModel.webUrl = currentBuild.webUrl;
										foundModel.lastUpdated = new Date();							
										foundModel.save(function(err, savedModel) {
											console.log("saving model", savedModel);
											Build.publishUpdate(savedModel.id, savedModel);
										});
									}

								}
							});
						}
					})(data.builds.build[i].$);
				}
			});

		}, 2000); // On 10 second intervals.
	});
	

  	// It's very important to trigger this callack method when you are finished 
  	// with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  	cb();
};