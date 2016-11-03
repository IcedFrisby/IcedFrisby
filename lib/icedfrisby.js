'use strict';


/*
 * IcedFrisby.js
 * 2015 Robert Herhold (maintainer) & other wonderful contrubuters
 * 2011-2014 Vance Lucas, Brightbit, LLC
 *
 * IcedFrisby is a library designed to easily test REST API endpoints and their
 * responses with node.js and Mocha. It is based on the original Frisby project.
 *
 * IcedFrisby is distributed under the MIT and BSD licenses
 * https://opensource.org/licenses/MIT
 * https://opensource.org/licenses/bsd-license
 */


const _ = require('lodash');
const chai = require('chai');
const chalk = require('chalk');
const https = require('https');
const pkg = require('../package.json');
const pm = require('./pathMatch');
const qs = require('qs');
const request = require('request');
const stream = require('stream').Stream;
const util = require('util');


// setup defaults
let _icedfrisbyDefaults = _.constant({
  request: {
    headers: {},
    inspectOnFailure: false,
    json: false,
    baseUri: ''
  }
});


// initialize setup defaults
let _init = _icedfrisbyDefaults();
let _initDefined = false;


/**
 * specify global defaults for IcedFrisby test run
 * @param {object} obj - setup object
 * @return {object}
 * @desc global setup function
 */
function globalSetup(obj) {
  if (!_.isUndefined(obj)) {
    if (_initDefined) { globalSetupDefined(_init, obj); }

    _initDefined = true;
    _init = _.merge(_.cloneDeep(_icedfrisbyDefaults()), obj);

    if(_init.useApp) {
      _init.request.baseUri = _useAppImpl(_init.useApp);
    }
  }
  return _init;
}


/**
 * warn or die if user uses globalSetup() improperly
 * @param {object} init -
 * @param {object} obj-
 * @return {object}
 * @desc check if global setup function has been defined
 */
function globalSetupDefined(init, obj) {
  if (init.failOnMultiSetup || obj.failOnMultiSetup) {
    throw new Error(chalk.red.bold('ERROR - ' +
      'globalSetup() called more than once, failOnMultiSetup set to true')
    );
  } else {
    console.log(chalk.yellow.bold('WARNING - ' +
      'globalSetup() called more than once, may cause unstable behavior')
    );
  }
}


/**
 * @param {object} headerName - header name
 * @param {object} headers- http headers
 * @return {boolean}
 * @desc verifies proper headers
 */
function _hasHeader(headername, headers) {
  let headerNames = Object.keys(headers || {});
  let lowerNames = headerNames.map(function (name) {return name.toLowerCase();});
  let lowerName = headername.toLowerCase();

  for (let i=0;i<lowerNames.length;i++) {
    if (lowerNames[i] === lowerName) return headerNames[i];
  }
  return false;
}


/**
 * @param {object} body - json object
 * @return {object}
 * @desc parse response body as json
 */
function _jsonParse(body) {
  let json = "";
  try {
    json = (typeof body === "object") ? body : JSON.parse(body);
  } catch (e) {
    throw new Error(
      "Error parsing JSON string: " + e.message + "\n\tGiven: " + body
    );
  }
  return json;
}


/**
 * @param {string} app - Node.js app. (e.g. Express, Koa)
 * @param {string} basePath - base path to append to the server address
 * @return {string}
 * @desc baseUri from the application, replacing any baseUri in globalSetup
 */
function _useAppImpl (app, basePath) {
  // sanity check app
  if (!app) { throw new Error('No app provided'); }

  // coerce basePath to a string
  basePath = basePath ? basePath + '' : '';

  let address = app.listen().address();
  let port = address.port;
  let protocol = app instanceof https.Server ? 'https' : 'http';

  return protocol + '://127.0.0.1:' + port + basePath;
}


/**
 * IcedFrisby object, uses create() to initialize
 * @constructor
 * @param {string} message - message to print for it()
 * @return {object}
 * @desc create IcedFrisby object
 */
function Frisby(msg) {
  let clone = _.cloneDeep(globalSetup());

  if(clone.request && clone.request.headers) {
    let headers = {};
    _.forEach(clone.request.headers, function(val, key) {
      headers[(key+"").toLowerCase()] = val+"";
    });
    clone.request.headers = headers;
  }

  // Optional exception handler
  this._exceptionHandler = false;

  // Spec storage
  this.current = {
    outgoing: {},
    describe: msg,
    itInfo: null,
    it: null,
    isNot: false,    // test negation
    inspections: [], // array of inspections to perform before the expectations
    expects: [],     // array expectations to perform
    after: [],
    retry: clone.retry || 0,
    retry_backoff: clone.retry_backoff || 1000,

    // Custom vars added to test HTTP Request (like headers)
    request: clone.request,

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
  this._timeout = clone.timeout || 5000;
  this.responseType = 'json';

  return this;
}


/**
 * @param {string} app - Node.js app. (e.g. Express, Koa)
 * @param {string} basePath - base path to append to the server address
 * @return {object}
 * @desc Setup the request to use a passed in Node http.Server app
 */
Frisby.prototype.useApp = function(app, basePath) {
  this.current.request.baseUri = _useAppImpl(app, basePath);
  return this;
};


/**
 * @param {number} ms - timeout value in milliseconds
 * @return {object}
 * @desc Timeout getter and setter
 */
Frisby.prototype.timeout = function(ms) {
  if(!ms) {
    return this._timeout;
  }
  this._timeout = ms;
  return this;
};


/**
 * @return {object}
 * @desc Reset Frisby global and setup options
 */
Frisby.prototype.reset = function() {
  this.current.request = _.cloneDeep(_icedfrisbyDefaults().request);
  return this;
};


/**
 * @param {string} header - header key
 * @param {string} content - header value content
 * @return {object}
 * @desc Add HTTP header by key and value
 */
Frisby.prototype.not = function() {
  this.current.isNot = true;
  return this;
};


/**
 * @param {string} header - header key
 * @param {string} content - header value content
 * @return {object}
 * @desc Add HTTP header by key and value
 */
Frisby.prototype.addHeader = function(header, content) {
  this.current.request.headers[(header+"").toLowerCase()] = content+"";
  return this;
};


/**
 * @param {object} headers - header object {k;v, k:v}
 * @return {object}
 * @desc Add group of HTTP headers together
 */
Frisby.prototype.addHeaders = function(headers) {
  let self = this;
  _.forEach(headers, function(val, key) {
    self.addHeader(key, val);
  });
  return this;
};


/**
 * @param {string} key - header key to remove
 * @return {object}
 * @desc Remove HTTP header from outgoing request by key
 */
Frisby.prototype.removeHeader = function (key) {
  delete this.current.request.headers[(key+"").toLowerCase()];
  return this;
};


/**
 * @param {string} user - username
 * @param {string} pass - password
 * @param {boolean} digest - set digest
 * @return {object}
 * @desc Setup HTTP basic auth
 */
Frisby.prototype.auth = function(user, pass, digest) {
  this.current.outgoing.auth = {
    sendImmediately: !digest,
    user: user,
    pass: pass
  };
  return this;
};


/**
 * Perform GET request against resource
 * @param {string} uri - resource
 * @param {object} [params] - uri parameters
 * @return {object}
 * @desc Perform an HTTP GET request
 * @example
 * .get('/resource', {key: value})
 */
Frisby.prototype.get = function (uri, params) {
  return this._request.apply(this, ['GET', uri, null, params]);
};


/**
 * @param {string} uri - resource
 * @param {object} [data] - patch data
 * @param {string} [param] - uri parameters
 * @desc Perform HTTP PATCH request
 * @example
 * .patch('/resource', {key: value}, {key: value})
 */
Frisby.prototype.patch = function (uri, data, params) {
  return this._request.apply(this, ['PATCH', uri, data, params]);
};


/**
 * @param {string} uri - resource
 * @param {object} [data] - post data
 * @param {string} [param] - uri parameters
 * @return {object}
 * @desc Perform HTTP POST request
 * @example
 * .post('/resource', {key: value}, {key: value})
 */
Frisby.prototype.post = function (uri, data, params) {
  return this._request.apply(this, ['POST', uri, data, params]);
};


/**
 * @param {string} uri - resource
 * @param {object} [data] - put data
 * @param {string} [param] - uri parameters
 * @return {object}
 * @desc Perform HTTP PUT request
 * @example
 * .put('/resource', {key: value}, {key: value})
 */
Frisby.prototype.put = function (uri, data, params) {
  return this._request.apply(this, ['PUT', uri, data, params]);
};


/**
 * @param {string} uri - resource
 * @param {object} [data] - delete data
 * @param {string} [param] - uri parameters
 * @return {object}
 * @desc Perform HTTP DELETE request
 * @example
 * .delete('/resource', {key: value}, {key: value})
 */
Frisby.prototype.delete = function (uri, data, params) {
  return this._request.apply(this, ['DELETE', uri, data, params]);
};


/**
 * @param {string} uri - resource (/identifier)
 * @param {string} [params] - uri parameters
 * @return {object}
 * @desc Perform HTTP HEAD request
 * @example
 * .head('/resource', {key: value})
 */
Frisby.prototype.head = function (uri, params) {
  return this._request.apply(this, ['HEAD', uri, null, params]);
};


/**
 * @param {string} uri - resource (/identifier)
 * @param {string} [params] - uri parameters
 * @return {object}
 * @desc Perform HTTP OPTIONS request
 * @example
 * .options('/resource', {key: value}, {key: value})
 */
Frisby.prototype.options = function (uri, params) {
    return this._request.apply(this, ['OPTIONS', uri, null, params]);
};


/**
 * @param {array} arguments - method [uri, data, params]
 * @param {string} uri - resource
 * @param {object} [data] - post data
 * @param {string} [param] - uri parameters
 * @return {object}
 * @desc _request object
 */
Frisby.prototype._request = function () {
    let self = this,
      args = _.slice(arguments),
      method = args.shift(),
      uri = typeof args[0] === 'string' && args.shift(),
      data = typeof args[0] === 'object' && args.shift(),
      params = typeof args[0] === 'object' && args.shift(),
      port = this.port && this.port !== 80 ? ':' + this.port : '',
      fullUri,
      outgoing = {
        json: params.json || (this.current.request.json || false),
        uri: null,
        body: params.body || undefined,
        method: 'GET',
        headers: {}
      };

    // Explicit setting of 'body' param overrides data
    if (params.body) {
      data = params.body;
    }

    // Merge 'current' request options for current request
    _.extend(outgoing, this.current.request, params || {});

    // Normalize content-type
    let contentTypeKey = _hasHeader('content-type', outgoing.headers);
    if (contentTypeKey !== 'content-type') {
      outgoing.headers['content-type'] = outgoing.headers[contentTypeKey];
      delete outgoing.headers[contentTypeKey];
    }

    // Ensure we have at least one 'content-type' header
    if (_.isUndefined(outgoing.headers['content-type'])) {
      outgoing.headers['content-type'] = 'application/x-www-form-urlencoded';
    }

    // If the content-type header contains 'json' but outgoing.json is false, the user likely messed up. Warn them.
    if (!outgoing.json && data && (outgoing.headers['content-type'].indexOf(
        'json') > -1)) {
      console.warn(
        chalk.yellow.bold(
          'WARNING - content-type is json but body type is not set')
      );
    }

    // Set outgoing URI
    outgoing.uri = (this.current.request.baseUri || '') + uri;

    //
    // If the user has provided data, assume that it is query string
    // and set it to the `body` property of the options.
    //
    if (data) {
      // if JSON data
      if (outgoing.json) {

        let isContentTypeHeaderMissing = outgoing.headers['content-type'] &&
          outgoing.headers['content-type'].indexOf('application/json') === -1;

        if (isContentTypeHeaderMissing) {
          outgoing.headers['content-type'] = 'application/json';
        }

        outgoing.body = data;
      } else if (!outgoing.body) {
        if (data instanceof Buffer) {
          outgoing.body = data;
        } else if (!(data instanceof stream)) {
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
  let runner = params.mock || request;

  //
  // Add the topic for the specified request to the context of the current
  // batch used by this suite.
  //
  this.current.it = function (cb) {
    self.currentRequestFinished = false;
    let start = (new Date()).getTime();
    let runCallback = function(err, res, body) {

      // Timeout is now handled by request
      if(err) {
        body = "[IcedFrisby] Destination URL may be down or URL is invalid, " + err;
      }

      let diff = (new Date()).getTime() - start;

      self.currentRequestFinished = {err: err, res: res, body: body, req: outgoing};

      // Convert header names to lowercase
      let headers = {};
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

    let req = null;

    // Handle forms (normal data with {form: true} in params options)
    if(!_.isUndefined(params.form) && params.form === true) {
      delete outgoing.headers['content-type'];
      req = runner(outgoing, runCallback);
      let form = req.form();
      for(let field in data) {
        form.append(field, data[field]);
      }
    } else {
      req = runner(outgoing, runCallback);
    }

    if ((data instanceof stream) && (
      outgoing.method === 'POST' ||
      outgoing.method === 'PUT' ||
      outgoing.method === 'PATCH')) {
        data.pipe(req);
    }

  };

  return this;
};


/**
 * @param {number} ms - Maximum response timeout in n milliseconds
 * @return {object}
 * @desc HTTP max response time expect helper
 */
Frisby.prototype.expectMaxResponseTime = function(ms) {
    let self = this;
    this.current.expects.push(function() {
        chai.expect(self.current.response.time).to.be.lessThan(ms);
    });
    return this;
};


/**
 * @param {number} statusCode - HTTP status code
 * @return {object}
 * @desc HTTP status code expect helper
 */
Frisby.prototype.expectStatus = function(statusCode) {
    let self = this;
    this.current.expects.push(function() {
        chai.expect(self.current.response.status).to.equal(statusCode);
    });
    return this;
};


/**
 * @param {string} header - header key
 * @param {string} content - header value content
 * @return {object}
 * @desc HTTP header expect helper
 */
Frisby.prototype.expectHeader = function (header, content) {
  let self = this;

  header = (header + "").toLowerCase();

  this.current.expects.push(function () {
    if (typeof self.current.response.headers[header] !== "undefined") {
      chai.expect(self.current.response.headers[header].toLowerCase()).to
        .equal(content.toLowerCase());
    } else {
      throw new Error("Header '" + header + "' not present in HTTP response");
    }
  });
  return this;
};


/**
 * @param {string} header - header key
 * @param {string} content - header value content
 * @return {object}
 * @desc HTTP header expect helper (using 'contains' instead of 'equals')
 */
Frisby.prototype.expectHeaderContains = function (header, content) {
  let self = this;
  header = (header + "").toLowerCase();
  this.current.expects.push(function () {
    if (typeof self.current.response.headers[header] !== "undefined") {
      chai.expect(self.current.response.headers[header].toLowerCase()).to
        .contain(content.toLowerCase());
    } else {
      throw new Error("Header '" + header +
        "' not present in HTTP response");
    }
  });
  return this;
};


/**
 * @param {string} header - header key
 * @param {string} pattern - header value content regular express
 * @return {object}
 * @desc HTTP header expect helper regular expression match
 */
Frisby.prototype.expectHeaderToMatch = function (header, pattern) {
  let self = this;
  header = (header + "").toLowerCase();
  this.current.expects.push(function () {
    if (typeof self.current.response.headers[header] !== "undefined") {
      chai.expect(self.current.response.headers[header].toLowerCase()).to
        .match(pattern);
    } else {
      throw new Error("Header '" + header + "' does not match pattern '" +
        pattern + "' in HTTP response");
    }
  });
  return this;
};

/**
 * @param {string} content - body content
 * @return {object}
 * @desc HTTP body expect helper
 */
Frisby.prototype.expectBodyContains = function (content) {
  let self = this;
  this.current.expects.push(function () {
    if (!_.isUndefined(self.current.response.body)) {
      chai.expect(self.current.response.body).to.contain(content);
    } else {
      throw new Error(
        "No HTTP response body was present or HTTP response was empty"
      );
    }
  });
  return this;
};

/**
 * @param {array} arguments - joi tree, path, jsonTest
 * @return {object}
 * @desc Helper to check parse HTTP response body as JSON and check key types
 */
Frisby.prototype.expectJSONTypes = function(/* [tree], jsonTest */) {
  let self     = this;
  let args     = _.slice(arguments);
  let path     = typeof args[0] === 'string' && args.shift();
  let jsonTest = typeof args[0] === 'object' && args.shift();
  let type     = null;

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

/**
 * @param {array} jsonTest - [path, jsonTest]
 * @return {object}
 * @desc Helper to check JSON response body exactly matches a provided object
 */
Frisby.prototype.expectJSON = function(jsonTest) {
    let self = this;
    let args = _.slice(arguments);
    let path = typeof args[0] === 'string' && args.shift();
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

/**
 * @param {array} jsonTest - [path, jsonTest]
 * @return {object}
 * @desc Helper to check JSON response contains a provided object
 */
Frisby.prototype.expectContainsJSON = function(jsonTest) {
    let self = this;
    let args = _.slice(arguments);
    let path = typeof args[0] === 'string' && args.shift();
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

/**
 * @param {array} expectedLength - [path, expectedLength]
 * @return {object}
 * @desc Helper to check response body as JSON and check array or object length
 */
Frisby.prototype.expectJSONLength = function (expectedLength) {
  let self = this;
  let args = _.slice(arguments);
  let path = _.isString(args[0]) && args.shift(); // optional 1st parameter
  expectedLength = (_.isNumber(args[0]) || _.isString(args[0])) && args.shift(); // 1st or 2nd parameter
  let lengthSegments = null;

  // if expectedLength is a string, we have to parse out the sign
  if (!_.isNumber(expectedLength)) {
    let sign = /\D+/.exec(expectedLength);
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

  this.current.expects.push(function () {
    pm.matchJSONLength({
      jsonBody: _jsonParse(self.current.response.body),
      jsonTest: lengthSegments, // we aren't testing any JSON here, just use this to pass in the length segments
      isNot: self.current.isNot,
      path: path
    });
  });

  return this;
};


/**
 * @param {inspectCallback} cb - callback
 * @return {object}
 * @desc inspection of data after request is made but before test is completed
 */
Frisby.prototype.inspect = function (cb) {
  // do nothing if no callback was provided
  if (!cb) {
    return this;
  }

  let self = this;
  this.current.inspections.push(function () {
    cb.call(this, self.current.response.error, self.currentRequestFinished
      .req, self.currentRequestFinished.res, self.current.response.body,
      self.current.response.headers);
  });
  return this;
};


/**
 * @param {string} message - message to print before the inspection
 * @return {object}
 * @desc Debugging helper to inspect the HTTP request
 */
Frisby.prototype.inspectRequest = function (message) {
  this.inspect(
    function (err, req, res, body) {
      if (message) {
        console.log(message);
      }
      console.log(req);
    });
  return this;
};


/**
 * @param {string} message - message to print before the inspection
 * @return {object}
 * @desc Debugging helper to inspect the HTTP response
 */
Frisby.prototype.inspectResponse = function (message) {
  this.inspect(
    function (err, req, res, body) {
      if (message) {
        console.log(message);
      }
      console.log(res);
    });
  return this;
};


/**
 * @param {string} message - message to print before the inspection
 * @return {object}
 * @desc Debugging helper to inspect the HTTP headers
 */
Frisby.prototype.inspectHeaders = function (message) {
  this.inspect(
    function (err, req, res, body) {
      if (message) {
        console.log(message);
      }
      console.log(res.headers);
    });
  return this;
};


/**
 * @param {string} message - message to print before the inspection
 * @return {object}
 * @desc Debugging helper to inspect the HTTP response body content
 */
Frisby.prototype.inspectBody = function (message) {
  this.inspect(
    function (err, req, res, body) {
      if (message) {
        console.log(message);
      }
      console.log(body);
    });
  return this;
};


/**
 * @param {string} message - message to print before the inspection
 * @return {object}
 * @desc Debugging helper to inspect the JSON response body content
 */
Frisby.prototype.inspectJSON = function (message) {
  this.inspect(
    function (err, req, res, body) {
      if (message) {
        console.log(message);
      }
      console.log(util.inspect(_jsonParse(body), false, 10, true));
    });
  return this;
};


/**
 * @param {string} message - message to print before the inspection
 * @return {object}
 * @desc Debugging helper to inspect the HTTP response code
 */
Frisby.prototype.inspectStatus = function (message) {
  this.inspect(
    function (err, req, res, body) {
      if (message) {
        console.log(message);
      }
      console.log(res.statusCode);
    });
  return this;
};


/**
 * @param {number} count - retry n times
 * @param {number} backoff - backoff each retry n milliseonds
 * @return {object}
 * @desc retry the request (good for flaky,slow tests)
 */
Frisby.prototype.retry = function (count, ms) {
  this.current.retry = count;
  if (typeof backoff !== "undefined") {
    this.current.retry_backoff = ms;
  }
  return this;
};

/**
 * @param {number} ms - n time in milliseconds
 * @return {object}
 * @desc time to wait before attempting to the test
 */
Frisby.prototype.waits = function(ms) {
  this.current.waits = ms;
  return this;
};

/**
 * @param {afterCallback} cb - callback
 * @return {object}
 * @desc callback function to run after test is completed
 */
Frisby.prototype.after = function (cb) {
  let self = this;
  this.current.after.push(function () {
    cb.call(this, self.current.response.error, self.currentRequestFinished.res,
                  self.current.response.body,  self.current.response.headers);
  });
  return this;
};

/**
 * @param {afterJSONCallback} cb - callback
 * @return {object}
 * @desc Callback function to run after test is completed,
 *       helper to convert response body to JSON
 * @example
 * .afterJSON(function(json) {
 *   // previous test JSON response
 *   let id = json.id
 *   frisby.create(msg)
 *     .get('/item' + id)
 *   .toss()
 * })
 */
Frisby.prototype.afterJSON = function(cb) {
  let self = this;
  this.current.after.push(function() {
    let responseHeaders = _jsonParse(self.current.response.headers);
    let bodyJSON = _jsonParse(self.current.response.body);
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


/* Methods to manually set parts of the response for matcher testing */

/**
 * @param {string} type - response type string
 * @return {object}
 * @desc set response type (default 'json')
 */
Frisby.prototype.setResponseType = function (type) {
  this.responseType = type;
  return this;
};

/**
 * @param {object} json - json object response content
 * @return {object}
 * @desc set JSON response
 */
Frisby.prototype.setResponseJSON = function(json) {
  this.currentRequestFinished = true;
  this.current.response.body = JSON.stringify(json);
  return this;
};

/**
 * @param {string} body - http response body content (xml, json, html)
 * @return {object}
 * @desc set response body
 */
Frisby.prototype.setResponseBody = function(body) {
  this.currentRequestFinished = true;
  this.current.response.body = body;
  return this;
};

/**
 * @param {array} headers - array of header objects
 * @return {object}
 * @desc set response headers, see addHeaders
 */
Frisby.prototype.setResponseHeaders = function(headers) {
  this.current.response.headers = headers;
  return this;
};

/**
 * @param {string} key - header key
 * @param {string} value - header value content
 * @return {object}
 * @desc set response headers, see addHeader
 */
Frisby.prototype.setResponseHeader = function(key, value) {
  this.current.response.headers[key.toLowerCase()] = value.toLowerCase();
  return this;
};


/**
 * @param {number} retry - n retries
 * @return {object}
 * @desc Run the current Frisby test
 */
Frisby.prototype.toss = function (retry) {
  let self = this;
  if (typeof retry === "undefined") {
    retry = self.current.retry;
  }

  // Assemble all tests and RUN them!
  describe(self.current.describe, function () {
    it("\n\t[ " + self.current.itInfo + " ]", function (done) {
      // Ensure "it" scope is accessible to tests
      let it = this;

      // mock results_
      it.results_ = {
        failedCount: 0
      };
      it.request = self.current.outgoing;

      // launch request
      // repeat request for self.current.retry times if request does not respond with self._timeout ms (except for POST requests)
      let tries = 0;
      let retries = (self.current.outgoing.method.toUpperCase() ==
        "POST") ? 0 : self.current.retry;

      // wait optinally, launch request
      if (self.current.waits > 0) {
        setTimeout(makeRequest, self.current.waits);
      } else {
        makeRequest();
      }


      function makeRequest() {
        let requestFinished = false;
        let timeoutFinished = false;
        tries++;

        let timeoutId = setTimeout(function maxWait() {
          timeoutFinished = true;
          if (tries < retries + 1) {
            it.results_.failedCount = 0;

            process.stdout.write('R');
            makeRequest();
          } else {
            // should abort instead (it.spec.fail ?)
            it.results_.failedCount = 1;
            // In frisby it.results_ would trigger a failure for jasmine but has
            // no effect in mocha. We need to indicate a failure for tests that
            // reach this point.
            let err ='Destination URL may be down or URL is invalid';
            after(err);
            // assert();
          }
        }, self._timeout);

        self.current.it(function (data) {
          if (!timeoutFinished) {
            clearTimeout(timeoutId);
            performInspections();
            assert();
          }
        });
      }


      // Perform inspections
      function performInspections() {
        for (let i = 0; i < self.current.inspections.length; i++) {
          let fn = self.current.inspections[i];
          fn.call(self);
        }
      }


      // Assert callback
      // called from makeRequest if request has finished successfully
      function assert() {
        let i;
        it.response = self.current.response;
        self.current.expectsFailed = true;

        // if you have no expects, they can't fail
        if (self.current.expects.length === 0) {
          retry = -1;
          self.current.expectsFailed = false;
        }

        // REQUIRES count for EACH loop iteration (i.e. DO NOT OPTIMIZE THIS LOOP)
        // Some 'expects' helpers add more tests when executed (recursive 'expectJSON' and 'expectJSONTypes', with nested JSON syntax etc.)
        for (let i = 0; i < self.current.expects.length; i++) {
          if (false !== self._exceptionHandler) {
            try {
              self.current.expects[i].call(it);
            } catch (e) {
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
        if (self.current.after) {

          if (self.current.expectsFailed && self.current.outgoing.inspectOnFailure) {
            console.log(self.current.itInfo +
              ' has FAILED with the following response:');
            self.inspectStatus();
            self.inspectJSON();
          }

          // REQUIRES count for EACH loop iteration (i.e. DO NOT OPTIMIZE THIS LOOP)
          // this enables after to add more after to do things (like inspectJSON)
          for (let i = 0; i < self.current.after.length; i++) {
            let fn = self.current.after[i];
            if (false !== self._exceptionHandler) {
              try {
                fn.call(self);
              } catch (e) {
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
