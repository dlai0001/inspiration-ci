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
var resolveAll = require("promised-io/promise").all;

var debounce = require('debounce');

var rest = require('restler'); //lib to do rest requests.

var moment = require('moment');

var compareVersion = require('../helpers/utilities').compareVersion;


module.exports.bootstrap = function (cb) {

	TeamCityPollService.init();
	

  	// It's very important to trigger this callack method when you are finished 
  	// with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  	cb();
};

