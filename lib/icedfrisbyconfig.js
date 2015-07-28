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

var fileExists = fs.existsSync(configFile);
if (!fileExists) {
    // If the default 'icedfrisby.yml' file doesn't exist, don't bother throwing an error
    // Don't want users to have to make an icedfrisby.yml file
    if (configFile == process.env.ICEDFRISBY_CONFIG) {
        throw new Error('[IcedFrisby] File ' + configFile + ' does not exist!');
    }
}

// Load configuration such that user config overrides the default
nconf
    .file({
        file: configFile,
        format: require('nconf-yaml')
    })
    .defaults(getDefaultConfig());

var config = nconf.get();

if (config.useApp) {
    require(config.useApp);
    try {
        config.useApp = require(config.useApp);
    } catch (err) {
        throw new Error('[IcedFrisby] Could not find app: ' + config.useApp);
    }
}

module.exports._config = config;
module.exports._getDefaultConfig = getDefaultConfig;
