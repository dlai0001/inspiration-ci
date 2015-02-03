var express = require('express');

module.exports.express = {
    customMiddleware: function(app) {
      console.log("Initializing static 3rd party vendor components.");
      app.use('/vendor', express.static(process.cwd() + "/bower_components/"));
    }
}