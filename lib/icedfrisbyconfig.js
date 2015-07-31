var fs = require('fs');
var nconf = require('nconf');
var _ = require('lodash');
var expect = require('chai').expect;

var _globalSetup;

// define the global setup defaults
var _getDefaultConfig = function() {
    return {
        request: {
            headers: {},
            inspectOnFailure: false,
            json: false,
            baseUri: ''
        }
    };
};

var _setGlobalSetup = function(globalSetupOpts) {
    _globalSetup = globalSetupOpts;
};

var _mergeConfigs = function() {

    var _requestConfig;

    if(_globalSetup) {
        _requestConfig = _.merge(_getDefaultConfig().request, _globalSetup.request, nconf.get('request'));
    } else {
        _requestConfig = _.merge(_getDefaultConfig().request, nconf.get('request'));
    }

    var config = nconf.get();
    config.request = _requestConfig;
    
    return config;
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
    .add('userConfig', {
        type: 'file',
        file: configFile,
        format: require('nconf-yaml')
    });

if (nconf.get('useApp')) {
    try {
        nconf.set('useApp', require(nconf.get('useApp')));
    } catch (err) {
        throw new Error('[IcedFrisby] Could not find app: ' + nconf.get('useApp'));
    }
}

module.exports._getConfig = _mergeConfigs;
module.exports._getDefaultConfig = _getDefaultConfig;
module.exports._setGlobalSetup = _setGlobalSetup;
