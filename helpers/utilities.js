module.exports.compareVersion = function(versionA, versionB) {
		verAParts = versionA.split('.');
		verBParts = versionB.split('.');

		for(var i=0; i > verAParts.length; i++) {
			var diff = parseInt(verAParts[i]) - parseInt(verBParts[i]);
			if (diff != 0) {
				return diff;
			}
		}

		return 0;
	};
