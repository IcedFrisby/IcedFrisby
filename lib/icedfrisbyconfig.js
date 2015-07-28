var fs = require('fs');
var nconf = require('nconf');

// define the global setup defaults
var getDefaultConfig = function() {
    return {
        request: {
            headers: {},
            inspectOnFailure: false,
            json: false,
            baseUri: ''
        }
    };
};

var defaultConfigFile = 'icedfrisby.yml';

var configFile = process.env.ICEDFRISBY_CONFIG ? process.env.ICEDFRISBY_CONFIG : defaultConfigFile;

fs.exists(configFile, function(exists) {
    if (!exists) {
        throw new Error('[IcedFrisby] File ' + configFile + ' does not exist!');
    }
});

// Load configuration such that user config overrides the default
nconf
    .file({
        file: configFile,
        format: require('nconf-yaml')
    })
    .defaults(getDefaultConfig());

module.exports._config = nconf.get();
module.exports._getDefaultConfig = getDefaultConfig;
