#!/usr/bin/env node

var fs = require('fs');
var pkg = require('../package.json');
var nconf = require('nconf');
var program = require('commander');
var _ = require('lodash');

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

program
    .version(pkg.version)
    .usage('[file]')
    .option('-c, --config [file]', 'Specify path to IcedFrisby configuration file')
    .parse(process.argv);

var ranCommand = false;

_.forEach(process.argv, function(arg) {
    if (_.includes(arg, 'icedfrisby')) {
        ranCommand = true;
    }
});

var configFile = program.config ? program.config : defaultConfigFile;

if (ranCommand) {
    // Only check the existance of the config file if they ran the 'icedfrisby'
    // command - still want to be able to use IcedFrisby w/o a CLI
    // If the command is not run, the default config will be used
    fs.exists(configFile, function(exists) {
        if (!exists) {
            throw new Error('[IcedFrisby] File ' + configFile + ' does not exist!');
        }
    });
}

// Load configuration such that user config overrides the default
nconf
    .file({
        file: configFile,
        format: require('nconf-yaml')
    })
    .defaults(getDefaultConfig());

module.exports._config = nconf.get();
module.exports._getDefaultConfig = getDefaultConfig;
