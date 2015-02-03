/**
 * StatusController
 *
 * @module      :: Controller
 * @description	:: A set of functions called `actions`.
 *
 *                 Actions contain code telling Sails how to respond to a certain type of request.
 *                 (i.e. do stuff, then send some JSON, show an HTML page, or redirect to another URL)
 *
 *                 You can configure the blueprint URLs which trigger these actions (`config/controllers.js`)
 *                 and/or override them with custom routes (`config/routes.js`)
 *
 *                 NOTE: The code you write here supports both HTTP and Socket.io automatically.
 *
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

var rest = require('restler'); //lib to do rest requests.
var fs = require('fs'); //file system access


var STATUS_RUNNING_PASSING = "RUNNING_PASSING";
var STATUS_RUNNING_FAILING = "RUNNING_FAILING";
var STATUS_PASSING = "PASSING";
var STATUS_FAILING = "FAILING";

var successImgPath = "./assets/images/success";
var successImages = fs.readdirSync(successImgPath);
successImages.forEach(function(element, index, array) { array[index] = "/images/success/" + element; });

console.log("Registered success images", successImages);
var failureImgPath = "./assets/images/failure";
var failureImages = fs.readdirSync(failureImgPath);
failureImages.forEach(function(element, index, array) { array[index] = "/images/failure/" + element; });
console.log("Registered failure images", failureImages);

module.exports = {
    
  index: function(req, res) {
    res.send({
      successImages: successImages,
      failureImages: failureImages
    });
  },

  new: function(req, res) {
    console.log("REQUEST OBJ FROM IMG ENDPT", req.method);

    if( req.method === "POST") {
      console.log("adding new image");
    } else {
      console.log("displaying new image form.");
    }

  },

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to StatusController)
   */
  _config: {},



};
