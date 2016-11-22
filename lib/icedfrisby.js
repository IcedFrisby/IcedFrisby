/*jslint node: true */

//
// IcedFrisby.js
// 2015 Robert Herhold (maintainer) & other wonderful contrubuters
// 2011-2014 Vance Lucas, Brightbit, LLC
//
// IcedFrisby is a library designed to easily test REST API endpoints and their responses with node.js and Mocha.
// It is based on the original Frisby project.
//
// IcedFrisby is distributed under the BSD license
// http://www.opensource.org/licenses/bsd-license.php

var nodeUtil = require('util');
var pm = require('./pathMatch');
var qs = require('qs');
var util = require('util');
var https = require('https');
var request = require('request');
var _ = require('lodash');
var stackTrace = require('stack-trace');
var fs = require('fs');
var fspath = require('path');
var Stream = require('stream').Stream;
var chalk = require('chalk');
var pkg = require('../package.json');

// setup Chai
var chai = require('chai');
chai.config.includeStack = false;
global.expect = chai.expect;

// define the global setup defaults
var getGlobalDefaults = _.constant({
  request: {
    headers: {},
    inspectOnFailure: false,
    json: false,
    baseUri: ''
  }
});

//
// Initialize Frisby global setup object config
//
var _frisbyGlobalSetup = getGlobalDefaults();

// global object to keep track of if the global setup has been setup by the user or not
var _frisbyGlobalAlreadySetup = false;

var globalSetup = function(opts) {
  // just return the global setup if opts is not specified
  if (!_.isUndefined(opts)) {

    // check if global setup has already been performed once and complain if the user is providing another global setup (not deep equal)
    if (_frisbyGlobalAlreadySetup) {
        if (_frisbyGlobalSetup.failOnMultiSetup || opts.failOnMultiSetup) {
            throw new Error('IcedFrisby global setup has already been done. Doing so again is disabled (see the failOnMultiSetup option) because it may cause indeterministic behavior.');
        } else {
            var message = chalk.inverse.yellow.bold('WARNING!') +
                ' You already defined the IcedFrisby global setup options. Doing so again may cause indeterministic behavior and is ' +
                chalk.red.bold('strongly discouraged.');
            console.warn(message);
        }
    }

    // set the global variable _frisbyGlobalAlreadySetup to true
    _frisbyGlobalAlreadySetup = true;

    // merge the passed in options with the defaults
    _frisbyGlobalSetup = _.merge(_.cloneDeep(getGlobalDefaults()), opts);

    // start app once per global setup
    if(_frisbyGlobalSetup.useApp) {
      _frisbyGlobalSetup.request.baseUri = _useAppImpl(_frisbyGlobalSetup.useApp);
    }
  }

  return _frisbyGlobalSetup;
};


//
// Frisby object
//
function Frisby(msg) {
  // Clone globalSetup (not reference).
  var _gs = _.cloneDeep(globalSetup());
  // _gs may contain mixed-cased header names, the code expects lowercase however.
  if(_gs.request && _gs.request.headers) {
    var _tmpHeaders = {};
    _.forEach(_gs.request.headers, function(val, key) {
      _tmpHeaders[(key+"").toLowerCase()] = val+"";
    });
    _gs.request.headers = _tmpHeaders;
  }

  // Optional exception handler
  this._exceptionHandler = false;

  // Spec storage
  this.current = {
    outgoing: {},
    describe: msg,
    itInfo: null,
    it: null,
    isNot: false, // test negation
    inspections: [], // array of inspections to perform before the expectations
    expects: [], // array expectations to perform
    after: [],
    retry: _gs.retry || 0,
    retry_backoff: _gs.retry_backoff || 1000,

    // Custom vars added to test HTTP Request (like headers)
    request: _gs.request,

    // Response storage
    response: {
      error: null,
      status: null,
      headers: [],
      body: null,
      time: 0
    }
  };

  this.currentRequestFinished = false;

  // Default timeout
  this._timeout = _gs.timeout || 5000;

  // Response type
  this.responseType = 'json';

  return this;
}

// Setup the request to use a passed in Node http.Server app
//
// @param app Node.js app. E.g. Express, Koa
// @param basePath base path to append to the server address
Frisby.prototype.useApp = function(app, basePath) {
  this.current.request.baseUri = _useAppImpl(app, basePath);
  return this;
};

// Builds the baseUri from the application, replacing
// any baseUri setup in globalSetup
//
// @param app Node.js app. E.g. Express, Koa
// @param basePath base path to append to the server address
// @return built base uri
function _useAppImpl (app, basePath) {
  // sanity check app
  if (!app) {
    throw new Error('No app provided');
  }

  // coerce basePath to a string
  basePath = basePath ? basePath + '' : '';

  var address = app.listen().address();
  var port = address.port;
  var protocol = app instanceof https.Server ? 'https' : 'http';

  return protocol + '://127.0.0.1:' + port + basePath;
}


//
// Timeout getter and setter
//
// @param int Timeout in seconds
//
Frisby.prototype.timeout = function(t) {
  if(!t) {
    return this._timeout;
  }
  this._timeout = t;
  return this;
};


//
// Reset Frisby global and setup options
//
Frisby.prototype.reset = function() {
  this.current.request = _.cloneDeep(getGlobalDefaults().request);
  return this;
};


//
// Set negation test
//
Frisby.prototype.not = function() {
  this.current.isNot = true;
  return this;
};


//
// Add HTTP header by key and value
//
// @param string header key
// @param string header value content
//
Frisby.prototype.addHeader = function(header, content) {
  this.current.request.headers[(header+"").toLowerCase()] = content+"";
  return this;
};

//
// Add group of HTTP headers together
//
Frisby.prototype.addHeaders = function (headers) {
  var self = this;
  _.forEach(headers, function(val, key) {
    self.addHeader(key, val);
  });
  return this;
};

//
// Remove HTTP header from outgoing request by key
//
// @param string header key
//
Frisby.prototype.removeHeader = function (key) {
  delete this.current.request.headers[(key+"").toLowerCase()];
  return this;
};


//
// Return response type
//
// @param {Object}
//
Frisby.prototype.responseType = function(type) {
  this.responseType = type;
  return this;
};


//
// HTTP Basic Auth
//
// @param string username
// @param string password
// @param boolean digest
//
Frisby.prototype.auth = function(user, pass, digest) {
  this.current.outgoing.auth = {
    sendImmediately: !digest,
    user: user,
    pass: pass
  };
  return this;
};


// HTTP Request
Frisby.prototype.get = function (/* [uri, params] */) {
  var args = Array.prototype.slice.call(arguments);
  args.splice(1, -1, null);
  return this._request.apply(this, ['GET'].concat(args));
};

Frisby.prototype.patch = function (/* [uri, data, params] */) {
  var args = Array.prototype.slice.call(arguments);
  return this._request.apply(this, ['PATCH'].concat(args));
};

Frisby.prototype.post = function (/* [uri, data, params] */) {
  var args = Array.prototype.slice.call(arguments);
  return this._request.apply(this, ['POST'].concat(args));
};

Frisby.prototype.put = function (/* [uri, data, params] */) {
  var args = Array.prototype.slice.call(arguments);
  return this._request.apply(this, ['PUT'].concat(args));
};

Frisby.prototype.delete = function (/* [uri, data, params] */) {
  var args = Array.prototype.slice.call(arguments);
  return this._request.apply(this, ['DELETE'].concat(args));
};

Frisby.prototype.head = function (/* [uri, params] */) {
  var args = Array.prototype.slice.call(arguments);
  args.splice(1, -1, null);
  return this._request.apply(this, ['HEAD'].concat(args));
};

Frisby.prototype.options = function (/* [uri, params] */) {
    var args = Array.prototype.slice.call(arguments);
    args.splice(1, -1, null);
    return this._request.apply(this, ['OPTIONS'].concat(args));
};

var _hasHeader = function (headername, headers) {
  var headerNames = Object.keys(headers || {});
  var lowerNames = headerNames.map(function (name) {return name.toLowerCase();});
  var lowerName = headername.toLowerCase();
  for (var i=0;i<lowerNames.length;i++) {
    if (lowerNames[i] === lowerName) return headerNames[i];
  }
  return false;
};

Frisby.prototype._request = function (/* method [uri, data, params] */) {
  var self    = this,
      args    = Array.prototype.slice.call(arguments),
      method  = args.shift(),
      uri     = typeof args[0] === 'string' && args.shift(),
      data    = typeof args[0] === 'object' && args.shift(),
      params  = typeof args[0] === 'object' && args.shift(),
      port    = this.port && this.port !== 80 ? ':' + this.port : '',
      fullUri,
      outgoing = {
        json: params.json || (this.current.request.json || false),
        uri: null,
        body: params.body || undefined,
        method: 'GET',
        headers: {}
      };

  // Explicit setting of 'body' param overrides data
  if(params.body) {
    data = params.body;
  }

  // Merge 'current' request options for current request
  _.extend(outgoing, this.current.request, params || {});

  // Normalize content-type

  var contentTypeKey = _hasHeader('content-type', outgoing.headers);
  if(contentTypeKey !== 'content-type') {
      outgoing.headers['content-type'] = outgoing.headers[contentTypeKey];
      delete outgoing.headers[contentTypeKey];
  }

  // Ensure we have at least one 'content-type' header
  if(_.isUndefined(outgoing.headers['content-type'])) {
    outgoing.headers['content-type'] = 'application/x-www-form-urlencoded';
  }

  // If the content-type header contains 'json' but outgoing.json is false, the user likely messed up. Warn them.
  if (!outgoing.json && data && (outgoing.headers['content-type'].indexOf('json') > -1)) {
    var message = chalk.inverse.yellow.bold('WARNING!') +
        ' You specified a content-type header with \'json\' but did not specify the body type to be json.';
    console.warn(message);
  }

  // Set outgoing URI
  outgoing.uri = (this.current.request.baseUri || '') + uri;

  //
  // If the user has provided data, assume that it is query string
  // and set it to the `body` property of the options.
  //
  if (data) {
    // if JSON data
    if(outgoing.json) {

      var isContentTypeHeaderMissing = outgoing.headers['content-type'] &&
                                       outgoing.headers['content-type'].indexOf('application/json') === -1;

      if (isContentTypeHeaderMissing) {
        outgoing.headers['content-type'] = 'application/json';
      }

      outgoing.body = data;
    } else if(!outgoing.body) {
      if(data instanceof Buffer) {
        outgoing.body = data;
      } else if (!(data instanceof Stream)) {
        outgoing.body = qs.stringify(data);
      }
    }
  }

  //
  // Set the `uri` and `method` properties of the request options `outgoing`
  // using the information provided to this instance and `_request()`.
  //
  outgoing.method = method;

  //
  // Store outgoing request on current Frisby object for inspection if needed
  //
  this.current.outgoing = outgoing;

  //
  // Create the description for this test based on the METHOD and URL
  //
  this.current.itInfo = method.toUpperCase() + ' ' + outgoing.uri;

  //
  // Determine test runner function (request or provided mock)
  //
  var runner = params.mock || request;

  //
  // Add the topic for the specified request to the context of the current
  // batch used by this suite.
  //
  this.current.it = function (cb) {
    self.currentRequestFinished = false;
    var start = (new Date()).getTime();
    var runCallback = function(err, res, body) {

      // Timeout is now handled by request
      if(err) {
        body = "Destination URL may be down or URL is invalid, " + err;
      }

      var diff = (new Date()).getTime() - start;

      self.currentRequestFinished = {err: err, res: res, body: body, req: outgoing};

      // Convert header names to lowercase
      var headers = {};
      if (res) {
          _.forEach(res.headers, function(val, key) {
            headers[(key+"").toLowerCase()] = val;
          });
      }
      // Store relevant current response parts
      self.current.response = {
        error: err,
        status: (res ? res.statusCode : 599), // use 599 - network connect timeout error
        headers: headers,
        body: body,
        time: diff
      };

      // call caller's callback
      if (cb && typeof cb === "function") {
        cb(self.current.response);
      }
    };

    outgoing.timeout = self._timeout;

    var req = null;

    // Handle forms (normal data with {form: true} in params options)
    if(!_.isUndefined(params.form) && params.form === true) {
      delete outgoing.headers['content-type'];
      req = runner(outgoing, runCallback);
      var form = req.form();
      for(var field in data) {
        form.append(field, data[field]);
      }
    } else {
      req = runner(outgoing, runCallback);
    }

    if((data instanceof Stream) && (outgoing.method === 'POST' || outgoing.method === 'PUT' || outgoing.method === 'PATCH'))  {
        data.pipe(req);
    }

  };

  return this;
};

// Max Response time expect helper
Frisby.prototype.expectMaxResponseTime = function(milliseconds) {
    var self = this;
    this.current.expects.push(function() {
        expect(self.current.response.time).to.be.lessThan(milliseconds);
    });
    return this;
};

// HTTP status expect helper
Frisby.prototype.expectStatus = function(statusCode) {
    var self = this;
    this.current.expects.push(function() {
        expect(self.current.response.status).to.equal(statusCode);
    });
    return this;
};

// HTTP header expect helper
Frisby.prototype.expectHeader = function(header, content) {
  var self = this;
  header = (header+"").toLowerCase();
  this.current.expects.push(function() {
    if(typeof self.current.response.headers[header] !== "undefined") {
      expect(self.current.response.headers[header].toLowerCase()).to.equal(content.toLowerCase());
    } else {
      throw new Error("Header '" + header + "' not present in HTTP response");
    }
  });
  return this;
};

// HTTP header expect helper (less strict version using 'contains' instead of strict 'equals')
Frisby.prototype.expectHeaderContains = function(header, content) {
  var self = this;
  header = (header+"").toLowerCase();
  this.current.expects.push(function() {
    if(typeof self.current.response.headers[header] !== "undefined") {
      expect(self.current.response.headers[header].toLowerCase()).to.contain(content.toLowerCase());
    } else {
      throw new Error("Header '" + header + "' not present in HTTP response");
    }
  });
  return this;
};

// HTTP header expect helper regular expression match
Frisby.prototype.expectHeaderToMatch = function(header, pattern) {
    var self = this;
    header = (header+"").toLowerCase();
    this.current.expects.push(function() {
        if(typeof self.current.response.headers[header] !== "undefined") {
            expect(self.current.response.headers[header].toLowerCase()).to.match(pattern);
        } else {
            throw new Error("Header '" + header + "' does not match pattern '" + pattern + "' in HTTP response");
        }
    });
    return this;
};

// HTTP body expect helper
Frisby.prototype.expectBodyContains = function(content) {
  var self = this;
  this.current.expects.push(function() {
    if(!_.isUndefined(self.current.response.body)) {
      expect(self.current.response.body).to.contain(content);
    } else {
      throw new Error("No HTTP response body was present or HTTP response was empty");
    }
  });
  return this;
};

// Helper to check parse HTTP response body as JSON and check key types
Frisby.prototype.expectJSONTypes = function(/* [tree], jsonTest */) {
  var self     = this;
  var args     = Array.prototype.slice.call(arguments);
  var path     = typeof args[0] === 'string' && args.shift();
  var jsonTest = typeof args[0] === 'object' && args.shift();
  var type     = null;

  this.current.expects.push(function() {
    pm.matchJSONTypes({
        jsonBody: _jsonParse(self.current.response.body),
        jsonTest: jsonTest,
        isNot: self.current.isNot,
        path: path
    });
  });
  return this;
};


// Checks that a JSON HTTP response body exactly matches a provided object
Frisby.prototype.expectJSON = function(jsonTest) {
    var self = this;
    var args = Array.prototype.slice.call(arguments);
    var path = typeof args[0] === 'string' && args.shift();
    jsonTest = typeof args[0] === 'object' && args.shift();

    this.current.expects.push(function() {
        pm.matchJSON({
            jsonBody: _jsonParse(self.current.response.body),
            jsonTest: jsonTest,
            isNot: self.current.isNot,
            path: path
        });
    });
    return this;
};

// Checks that a JSON HTTP response contains a provided object
Frisby.prototype.expectContainsJSON = function(jsonTest) {
    var self = this;
    var args = Array.prototype.slice.call(arguments);
    var path = typeof args[0] === 'string' && args.shift();
    jsonTest = typeof args[0] === 'object' && args.shift();

    this.current.expects.push(function() {
        pm.matchContainsJSON({
            jsonBody: _jsonParse(self.current.response.body),
            jsonTest: jsonTest,
            isNot: self.current.isNot,
            path: path
        });
    });
    return this;
};

// Helper to check parse HTTP response body as JSON and check array or object length
Frisby.prototype.expectJSONLength = function(expectedLength) {
  var self           = this;
  var args           = Array.prototype.slice.call(arguments);
  var path           = _.isString(args[0]) && args.shift(); // optional 1st parameter
  expectedLength     = (_.isNumber(args[0]) || _.isString(args[0])) && args.shift(); // 1st or 2nd parameter
  var lengthSegments = null;

  // if expectedLength is a string, we have to parse out the sign
  if (!_.isNumber(expectedLength)) {
    var sign = /\D+/.exec(expectedLength);
    lengthSegments = {
      count: parseInt(/\d+/.exec(expectedLength), 10),
      sign: sign ? _.trim(sign) : null // extract the sign, e.g. <, <=, >, >= and trim out whitespace
    };
  } else {
    lengthSegments = {
      count: expectedLength,
      sign: null
    };
  }

  this.current.expects.push(function() {
      pm.matchJSONLength({
          jsonBody: _jsonParse(self.current.response.body),
          jsonTest: lengthSegments, // we aren't testing any JSON here, just use this to pass in the length segments
          isNot: self.current.isNot,
          path: path
      });
  });

  return this;
};


// Callback function to perform an inspection of the request or response data
// This is run after request is made but before test is completed
Frisby.prototype.inspect = function(cb) {
  // do nothing if no callback was provided
  if (!cb) {
    return this;
  }

  var self = this;
  this.current.inspections.push(function() {
    cb.call(this, self.current.response.error, self.currentRequestFinished.req, self.currentRequestFinished.res, self.current.response.body, self.current.response.headers);
  });
  return this;
};

// Debugging helper to inspect HTTP request sent by Frisby
// @param message String message to print before the inspection
Frisby.prototype.inspectRequest = function(message) {
  this.inspect(
    function(err, req, res, body) {
      if (message) {
        console.log(message);
      }
      console.log(req);
    });
  return this;
};

// Debugging helper to inspect HTTP response received from server
// @param message String message to print before the inspection
Frisby.prototype.inspectResponse = function(message) {
  this.inspect(
    function(err, req, res, body) {
      if (message) {
        console.log(message);
      }
      console.log(res);
    });
  return this;
};

// Debugging helper to inspect the HTTP headers that are returned from the server
// @param message String message to print before the inspection
Frisby.prototype.inspectHeaders = function(message) {
  this.inspect(
    function(err, req, res, body) {
      if (message) {
        console.log(message);
      }
      console.log(res.headers);
    });
  return this;
};

// Debugging helper to inspect HTTP response body content received from server
// @param message String message to print before the inspection
Frisby.prototype.inspectBody = function(message) {
  this.inspect(
    function(err, req, res, body) {
      if (message) {
        console.log(message);
      }
      console.log(body);
    });
  return this;
};

// Debugging helper to inspect JSON response body content received from server
// @param message String message to print before the inspection
Frisby.prototype.inspectJSON = function(message) {
  this.inspect(
    function(err, req, res, body) {
      if (message) {
        console.log(message);
      }
      console.log(util.inspect(_jsonParse(body), false, 10, true));
    });
  return this;
};

// Debugging helper to inspect HTTP response code received from server
// @param message String message to print before the inspection
Frisby.prototype.inspectStatus = function(message) {
  this.inspect(
    function(err, req, res, body) {
      if (message) {
        console.log(message);
      }
      console.log(res.statusCode);
    });
  return this;
};

Frisby.prototype.retry = function(count, backoff) {
  this.current.retry = count;
  if(typeof backoff !== "undefined") {
    this.current.retry_backoff = backoff;
  }
  return this;
};

Frisby.prototype.waits = function(millis) {
  this.current.waits = millis;
  return this;
};

// Callback function to run after test is completed
Frisby.prototype.after = function(cb) {
  var self = this;
  this.current.after.push(function() {
    cb.call(this, self.current.response.error, self.currentRequestFinished.res, self.current.response.body, self.current.response.headers);
  });
  return this;
};

// Callback function to run after test is completed
// Helper to also automatically convert response body to JSON
Frisby.prototype.afterJSON = function(cb) {
  var self = this;
  this.current.after.push(function() {
    var responseHeaders = _jsonParse(self.current.response.headers);
    var bodyJSON = _jsonParse(self.current.response.body);
    cb.call(this, bodyJSON, responseHeaders);
  });
  return this;
};

// Exception handler callback function
Frisby.prototype.exceptionHandler = function(fn) {
  if(_.isUndefined(fn)) {
    return this._exceptionHandler;
  }
  this._exceptionHandler = fn;
  return this;
};

//
// Methods to manually set parts of the response for matcher testing
//

// Set response from JSON object
Frisby.prototype.setResponseJSON = function(json) {
  this.currentRequestFinished = true;
  this.current.response.body = JSON.stringify(json);
  return json;
};

// Set raw response body
Frisby.prototype.setResponseBody = function(body) {
  this.currentRequestFinished = true;
  this.current.response.body = body;
  return body;
};

// Set response headers
Frisby.prototype.setResponseHeaders = function(/* array */ headers) {
  this.current.response.headers = headers;
  return headers;
};

// Set single response header by key with specified value
Frisby.prototype.setResponseHeader = function(key, value) {
  this.current.response.headers[key.toLowerCase()] = value.toLowerCase();
  return this.current.response.headers[key.toLowerCase()];
};


//
// Toss (Run the current Frisby test)
//
Frisby.prototype.toss = function(retry) {
  var self = this;
  if (typeof retry === "undefined") {
    retry = self.current.retry;
  }

  // Assemble all tests and RUN them!
  describe(self.current.describe, function() {
    it("\n\t[ " + self.current.itInfo + " ]", function(done) {
      // Ensure "it" scope is accessible to tests
      var it = this;

      // mock results_
      it.results_ = {
        failedCount: 0
      };

      it.request = self.current.outgoing;

      // launch request
      // repeat request for self.current.retry times if request does not respond with self._timeout ms (except for POST requests)
      var tries = 0;
      var retries = (self.current.outgoing.method.toUpperCase() == "POST") ? 0 : self.current.retry;

      // wait optinally, launch request
      if (self.current.waits > 0) {
        setTimeout(makeRequest, self.current.waits);
      } else {
        makeRequest();
      }


      function makeRequest(){
        var requestFinished = false;
        var timeoutFinished = false;
        tries++;

        var timeoutId = setTimeout(function maxWait(){
          timeoutFinished = true;
          if (tries < retries+1){

            it.results_.totalCount = it.results_.passedCount = it.results_.failedCount = 0;
            it.results_.skipped = false;
            it.results_.items_ = [];

            process.stdout.write('R');
            makeRequest();
          } else {
            // should abort instead (it.spec.fail ?)
            it.results_.failedCount = 1;
            // In frisby it.results_ would trigger a failure for jasmine but has
            // no effect in mocha. We need to indicate a failure for tests that
            // reach this point.
            var err = 'Destination URL may be down or URL is invalid';
            after(err);
            // assert();
          }
        }, self._timeout);

        self.current.it(function(data) {
          if (!timeoutFinished) {
            clearTimeout(timeoutId);
            performInspections();
            assert();
          }
        });
      }


      // Perform inspections
      function performInspections() {
        for(i=0; i < self.current.inspections.length; i++) {
          var fn = self.current.inspections[i];
          fn.call(self);
        }
      }


      // Assert callback
      // called from makeRequest if request has finished successfully
      function assert() {
        var i;
        it.response = self.current.response;
        self.current.expectsFailed = true;

        // if you have no expects, they can't fail
        if (self.current.expects.length === 0) {
          retry = -1;
          self.current.expectsFailed = false;
        }

        // REQUIRES count for EACH loop iteration (i.e. DO NOT OPTIMIZE THIS LOOP)
        // Some 'expects' helpers add more tests when executed (recursive 'expectJSON' and 'expectJSONTypes', with nested JSON syntax etc.)
        for(i=0; i < self.current.expects.length; i++) {
          if(false !== self._exceptionHandler) {
            try {
              self.current.expects[i].call(it);
            } catch(e) {
              self._exceptionHandler.call(self, e);
            }
          } else {
            self.current.expects[i].call(it);
          }
        }

        if (it.results_.failedCount === 0) {
          retry = -1;
          self.current.expectsFailed = false;
        }

        // call after()
        after();
      }

      // AFTER callback (execute further expects for the current spec)
      // called from assert()
      function after(err) {
        if(self.current.after) {

          if (self.current.expectsFailed && self.current.outgoing.inspectOnFailure) {
            console.log(self.current.itInfo + ' has FAILED with the following response:');
            self.inspectStatus();
            self.inspectJSON();
          }

          // REQUIRES count for EACH loop iteration (i.e. DO NOT OPTIMIZE THIS LOOP)
          // this enables after to add more after to do things (like inspectJSON)
          for(i=0; i < self.current.after.length; i++) {
            var fn = self.current.after[i];
            if(false !== self._exceptionHandler) {
              try {
                fn.call(self);
              } catch(e) {
                self._exceptionHandler(e);
              }
            } else {
              fn.call(self);
            }
          }
        }

        // finally call done to finish spec
        if (err) {
          done(new Error(err));
        } else {
          done();
        }
      }

    });

  });
};


//
// Parse body as JSON, ensuring not to re-parse when body is already an object (thanks @dcaylor)
//
function _jsonParse(body) {
  var json = "";
  try {
    json = (typeof body === "object") ? body : JSON.parse(body);
  } catch(e) {
    throw new Error("Error parsing JSON string: " + e.message + "\n\tGiven: " + body);
  }
  return json;
}

////////////////////
// Module Exports //
////////////////////

//
// Main Frisby method used to start new spec tests
//
exports.create = function(msg) {
  return new Frisby(msg);
};

// Public methods and properties
exports.globalSetup = globalSetup;
exports.version = pkg.version;
