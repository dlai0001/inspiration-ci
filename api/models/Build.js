/**
 * Build
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 * @docs		:: http://sailsjs.org/#!documentation/models
 */

module.exports = {

  attributes: {
  	
  	/* e.g.
  	nickname: 'string'
  	*/
  	id: 'string',
    name: 'string',
    project: 'string',
    webUrl: 'string',
    version: 'string',
    percentComplete: 'integer',
    state: 'string',	//describes running state
    status: 'string',	//describes result of the build.
    lastUpdated: 'date'    
  }

};
