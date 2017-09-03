'use strict'


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


const _ = require('lodash')
const chai = require('chai')
const chalk = require('chalk')
const https = require('https')
const pkg = require('../package.json')
const pm = require('./pathMatch')
const qs = require('qs')
const request = require('request')
const stream = require('stream').Stream
const util = require('util')
const { errorFromList } = require('verror')


// setup defaults
const _icedfrisbyDefaults = _.constant({
  request: {
    headers: {},
    inspectOnFailure: false,
    json: false,
    baseUri: ''
  }
})


// initialize setup defaults
let _init = _icedfrisbyDefaults()
let _initDefined = false


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
    )
  } else {
    console.log(chalk.yellow.bold('WARNING - ' +
      'globalSetup() called more than once, may cause unstable behavior')
    )
  }
}


/**
 * @param {object} headerName - header name
 * @param {object} headers- http headers
 * @return {boolean}
 * @desc verifies proper headers
 */
function _hasHeader(headername, headers) {
  const headerNames = Object.keys(headers || {})
  const lowerNames = headerNames.map(function (name) {return name.toLowerCase()})
  const lowerName = headername.toLowerCase()

  for (let i=0;i<lowerNames.length;i++) {
    if (lowerNames[i] === lowerName) return headerNames[i]
  }
  return false
}


/**
 * Parse body as JSON, ensuring not to re-parse when body is already an object
 * (thanks @dcaylor).
 * @param {object} body - json object
 * @return {object}
 * @desc parse response body as json
 */
function _jsonParse(body) {
  let json = ""
  try {
    json = (typeof body === "object") ? body : JSON.parse(body)
  } catch (e) {
    throw new Error(
      "Error parsing JSON string: " + e.message + "\n\tGiven: " + body
    )
  }
  return json
}


/**
 * @param {string} app - Node.js app. (e.g. Express, Koa)
 * @param {string} basePath - base path to append to the server address
 * @return {string}
 * @desc Build the baseUri from the application, replacing any existing baseUri
 */
function _useAppImpl (app, basePath) {
  // sanity check app
  if (!app) { throw new Error('No app provided') }

  // coerce basePath to a string
  basePath = basePath ? basePath + '' : ''

  const address = app.listen().address()
  const port = address.port
  const protocol = app instanceof https.Server ? 'https' : 'http'

  return protocol + '://127.0.0.1:' + port + basePath
}


/**
 * IcedFrisby object, uses create() to initialize
 */
class Frisby {
  /**
   * @constructor
   * @param {string} message - message to print for it()
   * @return {object}
   */
  constructor (msg) {
    const clone = _.cloneDeep(Frisby.globalSetup())

    if(clone.request && clone.request.headers) {
      const headers = {}
      _.forEach(clone.request.headers, function(val, key) {
        headers[(key+"").toLowerCase()] = val+""
      })
      clone.request.headers = headers
    }

    // Optional exception handler
    this._exceptionHandler = false

    // Spec storage
    this.current = {
      outgoing: {},
      describe: msg,
      itInfo: null,
      it: null,
      isNot: false,    // test negation
      inspections: [], // array of inspections to perform before the expectations
      before: [],
      expects: [],     // array expectations to perform
      after: [],
      finally: [],
      retry: clone.retry || 0,
      retry_backoff: clone.retry_backoff || 1000,
      failures: [],

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
    }

    this.currentRequestFinished = false
    this._timeout = clone.timeout || 5000
    this.responseType = 'json'

    return this
  }


  /**
   * specify global defaults for IcedFrisby test run
   * @param {object} obj - setup object
   * @return {object}
   * @desc global setup function
   */
  static globalSetup (obj) {
    if (!_.isUndefined(obj)) {
      if (_initDefined) { globalSetupDefined(_init, obj) }

      _initDefined = true
      _init = _.merge(_.cloneDeep(_icedfrisbyDefaults()), obj)

      if(_init.useApp) {
        _init.request.baseUri = _useAppImpl(_init.useApp)
      }
    }
    return _init
  }


  /**
   * Main Frisby method used to start new spec tests
   */
  static create (msg) {
    // Use `this` instead of `Frisby` so this does the right thing when
    // composed with mixins.
    return new this(msg)
  }


  /**
   * Set the baseUri, replacing any baseUri from global setup
   * @param baseUri The new base URI
   */
  baseUri (baseUri) {
    this.current.request.baseUri = baseUri
    return this
  }


  /**
   * @param {string} app - Node.js app. (e.g. Express, Koa)
   * @param {string} basePath - base path to append to the server address
   * @return {object}
   * @desc Setup the request to use a passed in Node http.Server app
   */
  useApp (app, basePath) {
    this.current.request.baseUri = _useAppImpl(app, basePath)
    return this
  }


  /**
   * @param {number} ms - timeout value in milliseconds
   * @return {object}
   * @desc Timeout getter and setter
   */
  timeout (ms) {
    if(!ms) {
      return this._timeout
    }
    this._timeout = ms
    return this
  }


  /**
   * @return {object}
   * @desc Reset Frisby global and setup options
   */
  reset () {
    this.current.request = _.cloneDeep(_icedfrisbyDefaults().request)
    return this
  }


  /**
   * @param {string} header - header key
   * @param {string} content - header value content
   * @return {object}
   * @desc Add HTTP header by key and value
   */
  not () {
    this.current.isNot = true
    return this
  }


  /**
   * @param {string} header - header key
   * @param {string} content - header value content
   * @return {object}
   * @desc Add HTTP header by key and value
   */
  addHeader (header, content) {
    this.current.request.headers[(header+"").toLowerCase()] = content+""
    return this
  }


  /**
   * @param {object} headers - header object {k;v, k:v}
   * @return {object}
   * @desc Add group of HTTP headers together
   */
  addHeaders (headers) {
    const self = this
    _.forEach(headers, function(val, key) {
      self.addHeader(key, val)
    })
    return this
  }


  /**
   * @param {string} key - header key to remove
   * @return {object}
   * @desc Remove HTTP header from outgoing request by key
   */
  removeHeader (key) {
    delete this.current.request.headers[(key+"").toLowerCase()]
    return this
  }


  /**
   * @param {string} user - username
   * @param {string} pass - password
   * @param {boolean} digest - set digest
   * @return {object}
   * @desc Setup HTTP basic auth
   */
  auth (user, pass, digest) {
    this.current.outgoing.auth = {
      sendImmediately: !digest,
      user: user,
      pass: pass
    }
    return this
  }


  /**
   * Perform GET request against resource
   * @param {string} uri - resource
   * @param {object} [params] - uri parameters
   * @return {object}
   * @desc Perform an HTTP GET request
   * @example
   * .get('/resource', {key: value})
   */
  get (uri, params) {
    return this._request.apply(this, ['GET', uri, null, params])
  }


  /**
   * @param {string} uri - resource
   * @param {object} [data] - patch data
   * @param {string} [param] - uri parameters
   * @desc Perform HTTP PATCH request
   * @example
   * .patch('/resource', {key: value}, {key: value})
   */
  patch (uri, data, params) {
    return this._request.apply(this, ['PATCH', uri, data, params])
  }


  /**
   * @param {string} uri - resource
   * @param {object} [data] - post data
   * @param {string} [param] - uri parameters
   * @return {object}
   * @desc Perform HTTP POST request
   * @example
   * .post('/resource', {key: value}, {key: value})
   */
  post (uri, data, params) {
    return this._request.apply(this, ['POST', uri, data, params])
  }


  /**
   * @param {string} uri - resource
   * @param {object} [data] - put data
   * @param {string} [param] - uri parameters
   * @return {object}
   * @desc Perform HTTP PUT request
   * @example
   * .put('/resource', {key: value}, {key: value})
   */
  put (uri, data, params) {
    return this._request.apply(this, ['PUT', uri, data, params])
  }


  /**
   * @param {string} uri - resource
   * @param {object} [data] - delete data
   * @param {string} [param] - uri parameters
   * @return {object}
   * @desc Perform HTTP DELETE request
   * @example
   * .delete('/resource', {key: value}, {key: value})
   */
  delete (uri, data, params) {
    return this._request.apply(this, ['DELETE', uri, data, params])
  }


  /**
   * @param {string} uri - resource (/identifier)
   * @param {string} [params] - uri parameters
   * @return {object}
   * @desc Perform HTTP HEAD request
   * @example
   * .head('/resource', {key: value})
   */
  head (uri, params) {
    return this._request.apply(this, ['HEAD', uri, null, params])
  }


  /**
   * @param {string} uri - resource (/identifier)
   * @param {string} [params] - uri parameters
   * @return {object}
   * @desc Perform HTTP OPTIONS request
   * @example
   * .options('/resource', {key: value}, {key: value})
   */
  options (uri, params) {
    return this._request.apply(this, ['OPTIONS', uri, null, params])
  }


  /**
   * @param {array} arguments - method [uri, data, params]
   * @param {string} uri - resource
   * @param {object} [data] - post data
   * @param {string} [param] - uri parameters
   * @return {object}
   * @desc _request object
   */
  _request () {
    const self = this
    const args = _.slice(arguments)
    const method = args.shift()
    const uri = typeof args[0] === 'string' && args.shift()
    let data = typeof args[0] === 'object' && args.shift()
    const params = typeof args[0] === 'object' && args.shift()
    const outgoing = {
      json: params.json || (this.current.request.json || false),
      uri: null,
      body: params.body || undefined,
      method: 'GET',
      headers: {}
    }

    // Explicit setting of 'body' param overrides data
    if (params.body) {
      data = params.body
    }

    // Merge 'current' request options for current request
    _.extend(outgoing, this.current.request, params || {})

    // Normalize content-type
    const contentTypeKey = _hasHeader('content-type', outgoing.headers)
    if (contentTypeKey !== 'content-type') {
      outgoing.headers['content-type'] = outgoing.headers[contentTypeKey]
      delete outgoing.headers[contentTypeKey]
    }

    // Ensure we have at least one 'content-type' header
    if (_.isUndefined(outgoing.headers['content-type'])) {
      outgoing.headers['content-type'] = 'application/x-www-form-urlencoded'
    }

    // If the content-type header contains 'json' but outgoing.json is false, the user likely messed up. Warn them.
    if (!outgoing.json && data && (outgoing.headers['content-type'].indexOf(
        'json') > -1)) {
      console.warn(
        chalk.yellow.bold(
          'WARNING - content-type is json but body type is not set')
      )
    }

    // Set outgoing URI
    outgoing.uri = (this.current.request.baseUri || '') + uri

    //
    // If the user has provided data, assume that it is query string
    // and set it to the `body` property of the options.
    //
    if (data) {
      // if JSON data
      if (outgoing.json) {

        const isContentTypeHeaderMissing = outgoing.headers['content-type'] &&
          outgoing.headers['content-type'].indexOf('application/json') === -1

        if (isContentTypeHeaderMissing) {
          outgoing.headers['content-type'] = 'application/json'
        }

        outgoing.body = data
      } else if (!outgoing.body) {
        if (data instanceof Buffer) {
          outgoing.body = data
        } else if (!(data instanceof stream)) {
          outgoing.body = qs.stringify(data)
        }
      }
    }

    //
    // Set the `uri` and `method` properties of the request options `outgoing`
    // using the information provided to this instance and `_request()`.
    //
    outgoing.method = method

    //
    // Store outgoing request on current Frisby object for inspection if needed
    //
    this.current.outgoing = outgoing

    //
    // Create the description for this test based on the METHOD and URL
    //
    this.current.itInfo = method.toUpperCase() + ' ' + outgoing.uri

    //
    // Determine test runner function (request or provided mock)
    //
    const runner = params.mock || request

    //
    // Add the topic for the specified request to the context of the current
    // batch used by this suite.
    //
    this.current.it = function (cb) {
      self.currentRequestFinished = false
      const start = (new Date()).getTime()
      const runCallback = function(err, res, body) {

        // Timeout is now handled by request
        if(err) {
          body = "[IcedFrisby] Destination URL may be down or URL is invalid, " + err
        }

        const diff = (new Date()).getTime() - start

        self.currentRequestFinished = {err: err, res: res, body: body, req: outgoing}

        // Convert header names to lowercase
        const headers = {}
        if (res) {
          _.forEach(res.headers, function(val, key) {
            headers[(key+"").toLowerCase()] = val
          })
        }
        // Store relevant current response parts
        self.current.response = {
          error: err,
          status: (res ? res.statusCode : 599), // use 599 - network connect timeout error
          headers: headers,
          body: body,
          time: diff
        }

        // call caller's callback
        if (cb && typeof cb === "function") {
          cb(self.current.response)
        }
      }

      outgoing.timeout = self._timeout

      let req = null

      // Handle forms (normal data with {form: true} in params options)
      if(!_.isUndefined(params.form) && params.form === true) {
        delete outgoing.headers['content-type']
        req = runner(outgoing, runCallback)
        const form = req.form()
        for(const field in data) {
          form.append(field, data[field])
        }
      } else {
        req = runner(outgoing, runCallback)
      }

      if ((data instanceof stream) && (
        outgoing.method === 'POST' ||
        outgoing.method === 'PUT' ||
        outgoing.method === 'PATCH')) {
        data.pipe(req)
      }

    }

    return this
  }


  /**
   * @param {number} ms - Maximum response timeout in n milliseconds
   * @return {object}
   * @desc HTTP max response time expect helper
   */
  expectMaxResponseTime (ms) {
    const self = this
    this.current.expects.push(function() {
      chai.expect(self.current.response.time).to.be.lessThan(ms)
    })
    return this
  }


  /**
   * @param {number} statusCode - HTTP status code
   * @return {object}
   * @desc HTTP status code expect helper
   */
  expectStatus (statusCode) {
    const self = this
    this.current.expects.push(function() {
      chai.expect(self.current.response.status).to.equal(statusCode)
    })
    return this
  }


  /**
   * @param {string} header - header key
   * @param {string} content - header value content
   * @return {object}
   * @desc HTTP header expect helper
   */
  expectHeader (header, content) {
    const self = this

    header = (header + "").toLowerCase()

    this.current.expects.push(function () {
      if (typeof self.current.response.headers[header] !== "undefined") {
        chai.expect(self.current.response.headers[header].toLowerCase()).to
          .equal(content.toLowerCase())
      } else {
        throw new Error("Header '" + header + "' not present in HTTP response")
      }
    })
    return this
  }


  /**
   * @param {string} header - header key
   * @param {string} content - header value content
   * @return {object}
   * @desc HTTP header expect helper (using 'contains' instead of 'equals')
   */
  expectHeaderContains (header, content) {
    const self = this
    header = (header + "").toLowerCase()
    this.current.expects.push(function () {
      if (typeof self.current.response.headers[header] !== "undefined") {
        chai.expect(self.current.response.headers[header].toLowerCase()).to
          .contain(content.toLowerCase())
      } else {
        throw new Error("Header '" + header +
          "' not present in HTTP response")
      }
    })
    return this
  }


  /**
   * @param {string} header - header key
   * @param {string} pattern - header value content regular express
   * @return {object}
   * @desc HTTP header expect helper regular expression match
   */
  expectHeaderToMatch (header, pattern) {
    const self = this
    header = (header + "").toLowerCase()
    this.current.expects.push(function () {
      if (typeof self.current.response.headers[header] !== "undefined") {
        chai.expect(self.current.response.headers[header].toLowerCase()).to
          .match(pattern)
      } else {
        throw new Error("Header '" + header + "' does not match pattern '" +
          pattern + "' in HTTP response")
      }
    })
    return this
  }


  /**
   * @param {string} header - header key
   * @return {object}
   * @desc Asserts that a header is not present in the response
   */
  expectNoHeader (header) {
    header = (header + "").toLowerCase()

    this.current.expects.push(() => {
      chai.expect(this.current.response.headers).to.not.have.property(header)
    })

    return this
  }


  /**
   * @param {string} content - body content
   * @return {object}
   * @desc HTTP body expect helper
   */
  expectBodyContains (content) {
    const self = this
    this.current.expects.push(function () {
      if (!_.isUndefined(self.current.response.body)) {
        chai.expect(self.current.response.body).to.contain(content)
      } else {
        throw new Error(
          "No HTTP response body was present or HTTP response was empty"
        )
      }
    })
    return this
  }


  /**
   * @param {array} arguments - joi tree, path, jsonTest
   * @return {object}
   * @desc Helper to check parse HTTP response body as JSON and check key types
   */
  expectJSONTypes (/* [tree], jsonTest */) {
    const self = this
    const args = _.slice(arguments)
    const path = typeof args[0] === 'string' && args.shift()
    const jsonTest = typeof args[0] === 'object' && args.shift()

    this.current.expects.push(function() {
      pm.matchJSONTypes({
        jsonBody: _jsonParse(self.current.response.body),
        jsonTest: jsonTest,
        isNot: self.current.isNot,
        path: path
      })
    })
    return this
  }

  /**
   * @param {array} jsonTest - [path, jsonTest]
   * @return {object}
   * @desc Helper to check JSON response body exactly matches a provided object
   */
  expectJSON (jsonTest) {
    const self = this
    const args = _.slice(arguments)
    const path = typeof args[0] === 'string' && args.shift()
    jsonTest = typeof args[0] === 'object' && args.shift()

    this.current.expects.push(function() {
      pm.matchJSON({
        jsonBody: _jsonParse(self.current.response.body),
        jsonTest: jsonTest,
        isNot: self.current.isNot,
        path: path
      })
    })
    return this
  }


  /**
   * @param {array} jsonTest - [path, jsonTest]
   * @return {object}
   * @desc Helper to check JSON response contains a provided object
   */
  expectContainsJSON (jsonTest) {
    const self = this
    const args = _.slice(arguments)
    const path = typeof args[0] === 'string' && args.shift()
    jsonTest = typeof args[0] === 'object' && args.shift()

    this.current.expects.push(function() {
      pm.matchContainsJSON({
        jsonBody: _jsonParse(self.current.response.body),
        jsonTest: jsonTest,
        isNot: self.current.isNot,
        path: path
      })
    })
    return this
  }


  /**
   * @param {array} expectedLength - [path, expectedLength]
   * @return {object}
   * @desc Helper to check response body as JSON and check array or object length
   */
  expectJSONLength (expectedLength) {
    const self = this
    const args = _.slice(arguments)
    const path = _.isString(args[0]) && args.shift() // optional 1st parameter
    expectedLength = (_.isNumber(args[0]) || _.isString(args[0])) && args.shift() // 1st or 2nd parameter
    let lengthSegments = null

    // if expectedLength is a string, we have to parse out the sign
    if (!_.isNumber(expectedLength)) {
      const sign = /\D+/.exec(expectedLength)
      lengthSegments = {
        count: parseInt(/\d+/.exec(expectedLength), 10),
        sign: sign ? _.trim(sign) : null // extract the sign, e.g. <, <=, >, >= and trim out whitespace
      }
    } else {
      lengthSegments = {
        count: expectedLength,
        sign: null
      }
    }

    this.current.expects.push(function () {
      pm.matchJSONLength({
        jsonBody: _jsonParse(self.current.response.body),
        jsonTest: lengthSegments, // we aren't testing any JSON here, just use this to pass in the length segments
        isNot: self.current.isNot,
        path: path
      })
    })

    return this
  }


  /**
   * @param {inspectCallback} cb - callback
   * @return {object}
   * @desc inspection of data after request is made but before test is completed
   */
  inspect (cb) {
    const self = this

    if (!cb) {
      return self
    }

    // Node invokes inspect() when printing formatting objects. Guess if that's
    // happening based on the arguments passed, and delgate back to inspect,
    // disabling custom inspection.
    // https://nodejs.org/api/util.html#util_custom_inspection_functions_on_objects
    if ((typeof cb) !== 'function') {
      return util.inspect(self, { customInspect: false })
    }

    this.current.inspections.push(function () {
      cb.call(this, self.current.response.error, self.currentRequestFinished
        .req, self.currentRequestFinished.res, self.current.response.body,
        self.current.response.headers)
    })
    return this
  }


  /**
   * @param {string} message - message to print before the inspection
   * @return {object}
   * @desc Debugging helper to inspect the HTTP request
   */
  inspectRequest (message) {
    this.inspect(
      function (err, req, res, body) {
        if (message) {
          console.log(message)
        }
        console.log(req)
      })
    return this
  }


  /**
   * @param {string} message - message to print before the inspection
   * @return {object}
   * @desc Debugging helper to inspect the HTTP response
   */
  inspectResponse (message) {
    this.inspect(
      function (err, req, res, body) {
        if (message) {
          console.log(message)
        }
        console.log(res)
      })
    return this
  }


  /**
   * @param {string} message - message to print before the inspection
   * @return {object}
   * @desc Debugging helper to inspect the HTTP headers
   */
  inspectHeaders (message) {
    this.inspect(
      function (err, req, res, body) {
        if (message) {
          console.log(message)
        }
        console.log(res.headers)
      })
    return this
  }


  /**
   * @param {string} message - message to print before the inspection
   * @return {object}
   * @desc Debugging helper to inspect the HTTP response body content
   */
  inspectBody (message) {
    this.inspect(
      function (err, req, res, body) {
        if (message) {
          console.log(message)
        }
        console.log(body)
      })
    return this
  }


  /**
   * @param {string} message - message to print before the inspection
   * @return {object}
   * @desc Debugging helper to inspect the JSON response body content
   */
  inspectJSON (message) {
    this.inspect(
      function (err, req, res, body) {
        if (message) {
          console.log(message)
        }
        console.log(util.inspect(_jsonParse(body), false, 10, true))
      })
    return this
  }


  /**
   * @param {string} message - message to print before the inspection
   * @return {object}
   * @desc Debugging helper to inspect the HTTP response code
   */
  inspectStatus (message) {
    this.inspect(
      function (err, req, res, body) {
        if (message) {
          console.log(message)
        }
        console.log(res.statusCode)
      })
    return this
  }


  /**
   * @param {number} count - retry n times
   * @param {number} backoff - backoff each retry n milliseonds
   * @return {object}
   * @desc retry the request (good for flaky,slow tests)
   */
  retry (count, ms) {
    this.current.retry = count
    if (typeof backoff !== "undefined") {
      this.current.retry_backoff = ms
    }
    return this
  }


  /**
   * @param {number} ms - n time in milliseconds
   * @return {object}
   * @desc time to wait before attempting to the test
   */
  waits (ms) {
    this.current.waits = ms
    return this
  }


  /**
   * @param {afterCallback} cb - callback
   * @return {object}
   * @desc callback function to run before the request is made
   */
  before (cb) {
    if (!_.isFunction(cb)) {
      throw new Error('Expected Function object in before(), but got ' + typeof cb)
    }
    this.current.before.push(cb)
    return this
  }


  /**
   * @param {afterCallback} cb - callback
   * @return {object}
   * @desc callback function to run after test is completed
   */
  after (cb) {
    if (!_.isFunction(cb)) {
      throw new Error('Expected Function object in after(), but got ' + typeof cb)
    }
    if (cb.length > 4) { // assume it has a callback function argument
      this.current.after.push((done) => {
        cb.call(this, this.current.response.error, this.currentRequestFinished.res,
                      this.current.response.body,  this.current.response.headers, done)
      })
    } else {
      this.current.after.push(() => {
        cb.call(this, this.current.response.error, this.currentRequestFinished.res,
                      this.current.response.body,  this.current.response.headers)
      })
    }
    return this
  }

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
  afterJSON (cb) {
    const self = this
    this.current.after.push(function() {
      const responseHeaders = _jsonParse(self.current.response.headers)
      const bodyJSON = _jsonParse(self.current.response.body)
      cb.call(this, bodyJSON, responseHeaders)
    })
    return this
  }


  /**
   * Register a hook to run after a test runs, regardless of whether it
   * succeeded or failed.
   * @param {finallyCallback} cb - callback
   * @return {object}
   */
  finally (cb) {
    if (!_.isFunction(cb)) {
      throw new Error('Expected Function object in finally(), but got ' + typeof cb)
    }
    this.current.finally.push(cb)
    return this
  }


  /**
   * Set exception handler callback function.
   */
  exceptionHandler (fn) {
    if(_.isUndefined(fn)) {
      return this._exceptionHandler
    }
    this._exceptionHandler = fn
    return this
  }


  /* Methods to manually set parts of the response for matcher testing */

  /**
   * @param {string} type - response type string
   * @return {object}
   * @desc set response type (default 'json')
   */
  setResponseType (type) {
    this.responseType = type
    return this
  }


  /**
   * @param {object} json - json object response content
   * @return {object}
   * @desc set JSON response
   */
  setResponseJSON (json) {
    this.currentRequestFinished = true
    this.current.response.body = JSON.stringify(json)
    return this
  }


  /**
   * @param {string} body - http response body content (xml, json, html)
   * @return {object}
   * @desc set response body
   */
  setResponseBody (body) {
    this.currentRequestFinished = true
    this.current.response.body = body
    return this
  }


  /**
   * @param {array} headers - array of header objects
   * @return {object}
   * @desc set response headers, see addHeaders
   */
  setResponseHeaders (headers) {
    this.current.response.headers = headers
    return this
  }


  /**
   * @param {string} key - header key
   * @param {string} value - header value content
   * @return {object}
   * @desc set response headers, see addHeader
   */
  setResponseHeader (key, value) {
    this.current.response.headers[key.toLowerCase()] = value.toLowerCase()
    return this
  }


  /**
   * Register the current Frisby test with Mocha.
   */
  toss () {
    const self = this

    describe(self.current.describe, function () {
      it("\n\t[ " + self.current.itInfo + " ]", function (done) {
        self._start(done)
      })
    })
  }


  _hooks (hooks, completionCallback) {
    let invokationIndex = 0

    // naiive implementation of async callback support:
    const invokeNextHook = () => {
      if (invokationIndex === hooks.length) {
        completionCallback(null)
      } else {
        const nextHook = hooks[invokationIndex++]

        if (nextHook.length) { // assume it has a callback function argument
          try {
            nextHook.call(this, invokeNextHook)
          } catch (e) {
            if (false === this._exceptionHandler) {
              return completionCallback(e)
            } else {
              this._exceptionHandler(e)
              setImmediate(invokeNextHook)
            }
          }
        } else { // assume sync
          try {
            nextHook.call(this)
          } catch (e) {
            if (false === this._exceptionHandler) {
              return completionCallback(e)
            } else {
              this._exceptionHandler(e)
            }
          }
          setImmediate(invokeNextHook)
        }
      }
    }

    invokeNextHook()
  }


  _start (done) {
    // Repeat request for this.current.retry times if request does not respond
    // with this._timeout ms (except for POST requests).
    this.current.tries = 0
    this.current.retries = this.current.outgoing.method.toUpperCase() === 'POST'
      ? 0
      : this.current.retry

    // When an error occurs in a before() hook, stop executing before hooks and
    // move on to finally() hooks. This mimics Mocha's behavior of before() and
    // after() hooks. A dev-provided exception handler overrides this behavior.
    this._hooks(this.current.before, (e) => {
      if (e) {
        this.current.failures.push(e)
        this._finish(done)
      } else {
        if (this.current.waits > 0) {
          setTimeout(() => { this._makeRequest(done) }, this.current.waits)
        } else {
          this._makeRequest(done)
        }
      }
    })
  }


  _makeRequest (done) {
    const self = this
    let timeoutFinished = false
    self.current.tries++

    const timeoutId = setTimeout(function maxWait() {
      timeoutFinished = true
      if (self.current.tries < self.current.retries + 1) {
        process.stdout.write('R')
        self._makeRequest(done)
      } else {
        // In frisby it.results_ would trigger a failure for jasmine but has
        // no effect in mocha. We need to indicate a failure for tests that
        // reach this point.
        const err = Error('Destination URL may be down or URL is invalid')
        self.current.failures.push(err)
        self._finish(done)
      }
    }, self._timeout)

    self.current.it(function (data) {
      if (!timeoutFinished) {
        clearTimeout(timeoutId)
        self._performInspections.call(self)
        self._invokeExpects.call(self, done)
      }
    })
  }


  _performInspections () {
    for (let i = 0; i < this.current.inspections.length; i++) {
      const fn = this.current.inspections[i]
      fn.call(this)
    }
  }


  // called from makeRequest if request has finished successfully
  _invokeExpects (done) {
    // REQUIRES count for EACH loop iteration (i.e. DO NOT OPTIMIZE THIS LOOP)
    // Some 'expects' helpers add more tests when executed (recursive
    // 'expectJSON' and 'expectJSONTypes', with nested JSON syntax etc.)
    for (let i = 0; i < this.current.expects.length; i++) {
      try {
        this.current.expects[i].call(null)
      } catch (e) {
        if (false === this._exceptionHandler) {
          this.current.failures.push(e)
          break
        } else {
          this._exceptionHandler.call(this, e)
        }
      }
    }

    this._finish(done)
  }


  // Execute further expects for the current spec (called from _invokeExpects)
  _finish (done) {
    const didPass = this.current.failures.length === 0,
      didFail = !didPass

    if (didFail && this.current.outgoing.inspectOnFailure) {
      console.log(this.current.itInfo +
        ' has FAILED with the following response:')
      this.inspectStatus()
      this.inspectJSON()
    }

    const finalizeTest = () => {
      // Return null, sole error, or a MultiError.
      // https://github.com/joyent/node-verror#verrorerrorfromlisterrors
      const retError = errorFromList(this.current.failures)

      // Finally call done to finish spec.
      done(retError)
    }

    const invokeFinalHooks = () => {
      // Stop after the first error, mimicking Mocha's behavior in after()
      // callbacks.
      this._hooks(this.current.finally, (e) => {
        if (e) {
          this.current.failures.push(e)
        }

        finalizeTest()
      })
    }

    // Once a failure has occurred, stop running any remaining after() hooks.
    if (didPass && this.current.after) {
      this._hooks(this.current.after, (e) => {
        if (e) {
          this.current.failures.push(e)
        }

        invokeFinalHooks()
      })
    } else {
      invokeFinalHooks()
    }
  }
}
module.exports = Frisby

Frisby.version = pkg.version
