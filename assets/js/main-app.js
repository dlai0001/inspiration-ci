/**
 * app.js
 *
 * This file contains some conventional defaults for working with Socket.io + Sails.
 * It is designed to get you up and running fast, but is by no means anything special.
 *
 * Feel free to change none, some, or ALL of this file to fit your needs!
 */

// Create log() to wrap console.log to avoid erroring on browsers that do not support it.
function log () {
  if (typeof console !== 'undefined') {
    console.log.apply(console, arguments);
  }
}

// Initializing Socket IO
(function (io) {
  // as soon as this file is loaded, connect automatically, 
  var socket = io.connect();

  // Expose connected `socket` instance globally so that it's easy
  // to experiment with from the browser console while prototyping.
  window.socket = socket;

})(window.io);


/**
 * @ngdoc overview
 * @name angularSchedulerSpikeApp
 * @description
 * # angularSchedulerSpikeApp
 *
 * Main module of the application.
 */
angular
  .module('inspirationCi', [])
  .config(function () {    
  });