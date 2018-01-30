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
const Stream = require('stream').Stream
const util = require('util')
const { errorFromList } = require('verror')


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
 * @return {Object}
 */
function startApp (app, basePath) {
  // coerce basePath to a string
  basePath = basePath ? basePath + '' : ''

  const server = app.listen()

  const protocol = app instanceof https.Server ? 'https' : 'http'
  const port = server.address().port

  return {
    server,
    uri: `${protocol}://127.0.0.1:${port}${basePath}`,
  }
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
  constructor (message) {
    // Optional exception handler
    this._exceptionHandler = false

    Object.assign(this, {
      _message: message,
      _hooks: {
        before: [],
        after: [],
        finally: [],
      },
      _inspects: [],
      _expects: [],
      _failures: [],
      _attempts: {
        count: 0,
        maxRetries: 0,
        backoffMillis: 1000,
      },
      _runner: null,
      _requestArgs: null,
      _outgoing: null,
      _waitsMillis: 0,
      _response: {
        error: null,
        status: null,
        headers: [],
        body: null,
        time: 0,
      },
      _inspectOnFailure: true,
    })

    // Spec storage
    this.current = {
      isNot: false,    // test negation

      // For an app provided to a single test.
      app: null,

      // Custom vars added to test HTTP Request (like headers)
      request: {
        headers: {},
        json: false,
        baseUri: '',
      },
    }

    this.currentRequestFinished = false
    this._timeout = 5000
    this._only = false

    return this
  }


  /**
   * specify global defaults for IcedFrisby test run
   * @param {object} obj - setup object
   * @return {object}
   * @desc global setup function
   */
  static globalSetup () {
    throw Error('globalSetup() has been removed.')
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
    if (!app) { throw new Error('No app provided') }
    this.current.useApp = { app, basePath }
    // The app's baseUri won't be known until the app is started. Its uri
    // will be prepended then.
    this.current.request.baseUri = null
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
    throw Error('reset() has been removed.')
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
   * @param {object} headers - header object {k:v, k:v}
   * @return {object}
   * @desc Add group of HTTP headers together
   */
  addHeaders (headers) {
    Object.keys(headers).forEach(key => {
      this.addHeader(key, headers[key])
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
    this.current.request.auth = {
      sendImmediately: !digest,
      user,
      pass,
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
    const args = Array.from(arguments)
    const method = args.shift()
    const uri = typeof args[0] === 'string' && args.shift()
    const data = typeof args[0] === 'object' && args.shift()
    const params = typeof args[0] === 'object' && args.shift()

    this._requestArgs = { method, uri, data, params }

    // Store test runner function (request or provided mock).
    this._runner = params.mock || request

    return this
  }


  _expect (fn) {
    this._expects.push(fn)
    return this
  }


  /**
   * @param {number} ms - Maximum response timeout in n milliseconds
   * @return {object}
   * @desc HTTP max response time expect helper
   */
  expectMaxResponseTime (ms) {
    return this._expect(() => {
      chai.expect(this._response.time).to.be.lessThan(ms)
    })
  }


  /**
   * @param {number} statusCode - HTTP status code
   * @return {object}
   * @desc HTTP status code expect helper
   */
  expectStatus (statusCode) {
    return this._expect(() => {
      chai.expect(this._response.status).to.equal(statusCode)
    })
  }


  /**
   * @param {string} header - header key
   * @param {string} content - header value content
   * @return {object}
   * @desc HTTP header expect helper
   */
  expectHeader (header, content, options = {}) {
    const self = this

    header = (header + "").toLowerCase()
    options = {
      allowMultipleHeaders: options.allowMultipleHeaders || false
    }

    return this._expect(function () {
      if(!options.allowMultipleHeaders && self._response.headers[header] instanceof Array){
        throw new Error("Header '" + header + "' present more than once in HTTP response. Pass {allowMultipleHeaders: true} in options if this is expected.")
      }
      if (typeof self._response.headers[header] !== "undefined") {
        let responseHeaders = [].concat(self._response.headers[header])
        if(content instanceof RegExp){
          chai.expect(responseHeaders).to
            .include.something.that.matches(content)
        }
        else if(typeof content === "string"){
          responseHeaders = responseHeaders.map(thisHeader => thisHeader.toLowerCase())
          chai.expect(responseHeaders).to
            .include.a.thing.that.equals(content.toLowerCase())
        }
        else {
          throw new Error("Content '" + content + "' is neither a string or regex")
        }
      } else {
        throw new Error("Header '" + header + "' not present in HTTP response")
      }
    })
  }

  /**
   * @param {string} header - header key
   * @param {string} content - header value content
   * @return {object}
   * @desc HTTP header expect helper (using 'contains' instead of 'equals')
   */
  expectHeaderContains (header, content, options = {}) {
    header = (header + "").toLowerCase()
    options = {
      allowMultipleHeaders: options.allowMultipleHeaders || false
    }

    return this._expect(() => {
      if(!options.allowMultipleHeaders && this._response.headers[header] instanceof Array){
        throw new Error("Header '" + header + "' present more than once in HTTP response. Pass {allowMultipleHeaders: true} in options if this is expected.")
      }
      if (typeof this._response.headers[header] !== "undefined") {
        const responseHeaders = [].concat(this._response.headers[header]).map(thisHeader => thisHeader.toLowerCase())
        chai.expect(responseHeaders).to
          .include.something.that.satisfies(thisHeader => thisHeader.toLowerCase().includes(content.toLowerCase()),
            content.toLowerCase() + ' not found in ' + responseHeaders)
          // Ugly workaround for https://github.com/chaijs/chai-things/issues/42 or something closely related
          // .include.something.that.contains(textVar) has the same problem, and all values
          // are checked, throwing failures when one doesn't match.
          // Hence the awful use of custom messaging... Sorry.
      } else {
        throw new Error("Header '" + header +
          "' not present in HTTP response")
      }
    })
  }

  /**
   * @param {string} header - header key
   * @param {string} pattern - header value content regular express
   * @return {object}
   * @desc Alias for expectHeader
   */
  expectHeaderToMatch (header, pattern) {
    return this.expectHeader(header,pattern)
  }


  /**
   * @param {string} header - header key
   * @return {object}
   * @desc Asserts that a header is not present in the response
   */
  expectNoHeader (header) {
    header = (header + "").toLowerCase()

    return this._expect(() => {
      chai.expect(this._response.headers).to.not.have.property(header)
    })
  }


  /**
   * @param {string} content - body content
   * @return {object}
   * @desc HTTP body expect helper
   */
  expectBodyContains (content) {
    return this._expect(() => {
      if (!_.isUndefined(this._response.body)) {
        chai.expect(this._response.body).to.contain(content)
      } else {
        throw Error(
          "No HTTP response body was present or HTTP response was empty"
        )
      }
    })
  }


  /**
   * @param {array} arguments - joi tree, path, jsonTest
   * @return {object}
   * @desc Helper to check parse HTTP response body as JSON and check key types
   */
  expectJSONTypes (/* [tree], jsonTest */) {
    const args = Array.from(arguments)
    const path = typeof args[0] === 'string' && args.shift()
    const jsonTest = typeof args[0] === 'object' && args.shift()

    return this._expect(() => {
      pm.matchJSONTypes({
        jsonBody: _jsonParse(this._response.body),
        jsonTest: jsonTest,
        isNot: this.current.isNot,
        path: path
      })
    })
  }

  /**
   * @param {array} jsonTest - [path, jsonTest]
   * @return {object}
   * @desc Helper to check JSON response body exactly matches a provided object
   */
  expectJSON (jsonTest) {
    const args = Array.from(arguments)
    const path = typeof args[0] === 'string' && args.shift()
    jsonTest = typeof args[0] === 'object' && args.shift()

    return this._expect(() => {
      pm.matchJSON({
        jsonBody: _jsonParse(this._response.body),
        jsonTest,
        isNot: this.current.isNot,
        path,
      })
    })
  }


  /**
   * @param {array} jsonTest - [path, jsonTest]
   * @return {object}
   * @desc Helper to check JSON response contains a provided object
   */
  expectContainsJSON (jsonTest) {
    const args = Array.from(arguments)
    const path = typeof args[0] === 'string' && args.shift()
    jsonTest = typeof args[0] === 'object' && args.shift()

    return this._expect(() => {
      pm.matchContainsJSON({
        jsonBody: _jsonParse(this._response.body),
        jsonTest,
        isNot: this.current.isNot,
        path,
      })
    })
  }


  /**
   * @param {array} expectedLength - [path, expectedLength]
   * @return {object}
   * @desc Helper to check response body as JSON and check array or object length
   */
  expectJSONLength (expectedLength) {
    const args = Array.from(arguments)
    const path = _.isString(args[0]) && args.shift() // optional 1st parameter
    expectedLength = (_.isNumber(args[0]) || _.isString(args[0])) && args.shift() // 1st or 2nd parameter
    let lengthSegments = null

    // if expectedLength is a string, we have to parse out the sign
    if (!_.isNumber(expectedLength)) {
      const sign = /\D+/.exec(expectedLength)
      lengthSegments = {
        count: parseInt(/\d+/.exec(expectedLength), 10),
        sign: sign ? sign[0].trim() : null // extract the sign, e.g. <, <=, >, >= and trim out whitespace
      }
    } else {
      lengthSegments = {
        count: expectedLength,
        sign: null
      }
    }

    return this._expect(() => {
      pm.matchJSONLength({
        jsonBody: _jsonParse(this._response.body),
        jsonTest: lengthSegments, // we aren't testing any JSON here, just use this to pass in the length segments
        isNot: this.current.isNot,
        path,
      })
    })
  }


  /**
   * @param {object} options object
   *
   * @desc Set configuration options on this object.
   * inspectOnFailure: This is a really neat option that will help you figure out what is happening with your requests. Dumps request/response information to the logs.
   * timeout: Sets the maximum time we'll wait for a response before failing the request
   * retry: Number of times we'll try this request before returning a failure. If timeout is set, each retry uses the timeout.
   * request: Options for the request module. An object containing any of these: https://github.com/request/request#requestoptions-callback
   * json: Sets body to JSON representation of value and adds Content-type: application/json header. Additionally, parses the response body as JSON. 
  */
  config (opts) {
    if ('inspectOnFailure' in opts) {
      this._inspectOnFailure = opts.inspectOnFailure
    }
    if ('timeout' in opts){
      this._timeout = opts.timeout
    }
    if ('retry' in opts){
      this._attempts.maxRetries = opts.retry
    }
    if ('request' in opts) {
      for(const request_option in opts.request){
        if(opts.request.hasOwnProperty(request_option)){
          this.current.request[request_option] = opts.request[request_option]
        }
      }
    }
    if ('json' in opts) {
      this.current.request.json = opts.json //opts.json will override opts.request.json, if provided
    }
    return this
  }


  /**
   * @param {inspectCallback} cb - callback
   * @return {object}
   * @desc inspection of data after request is made but before test is completed
   */
  inspect (cb) {
    // This function uses both `self` and `this`. Are they different? Hmm.
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

    this._inspects.push(function () {
      cb.call(this, self._response.error, self.currentRequestFinished
        .req, self.currentRequestFinished.res, self._response.body,
      self._response.headers)
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
   * @param {number} backoffMillis - backoff time for each retry
   * @return {object}
   * @desc retry the request (good for flaky,slow tests)
   */
  retry (count, backoffMillis) {
    this._attempts.maxRetries = count
    if (typeof backoffMillis !== "undefined") {
      this._attempts.backoffMillis = backoffMillis
    }
    return this
  }


  /**
   * @param {number} ms - n time in milliseconds
   * @return {object}
   * @desc time to wait before attempting to the test
   */
  waits (ms) {
    this._waitsMillis = ms
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
    this._hooks.before.push(cb)
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
      this._hooks.after.push((done) => {
        cb.call(this, this._response.error, this.currentRequestFinished.res,
          this._response.body, this._response.headers, done)
      })
    } else {
      this._hooks.after.push(() => {
        cb.call(this, this._response.error, this.currentRequestFinished.res,
          this._response.body, this._response.headers)
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
    this._hooks.after.push(function() {
      const responseHeaders = _jsonParse(this._response.headers)
      const bodyJSON = _jsonParse(this._response.body)
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
    this._hooks.finally.push(cb)
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

  only () {
    this._only = true
    return this
  }


  _mochaTimeout () {
    // If one retry is allowed, the test needs:
    //   timeout interval for first request +
    //     retry backoff +
    //     timeout interval for second request
    //
    // We add a little extra time so frisby can handle the timeout.
    const gracePeriodMillis = 25
    return this._timeout +
      this._attempts.maxRetries * (this._attempts.backoffMillis + this._timeout) +
      gracePeriodMillis
  }


  get testInfo () {
    const { method, uri } = this._requestArgs
    return `${method.toUpperCase()} ${uri}`
  }


  /**
   * Register the current Frisby test with Mocha.
   */
  toss () {
    // Use `self` in order to preserve the Mocha context.
    const self = this

    const describeFn = this._only ? describe.only : describe

    describeFn(self._message, function () {
      before(function () {
        if (self.current.useApp) {
          const { app, baseUri } = self.current.useApp
          const { server, uri } = startApp(app, baseUri)
          self.current.server = server
          self._requestArgs.uri = uri + self._requestArgs.uri
        }
      })
      after(function (done) {
        if (self.current.server) {
          self.current.server.close(() => { done() })
        } else {
          done()
        }
      })

      it(`\n\t[ ${self.testInfo} ]`, function(done) {
        self._start(done)
      }).timeout(self._mochaTimeout())
    })
  }


  _runHooks (hooks, completionCallback) {
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
    // When an error occurs in a before() hook, stop executing before hooks and
    // move on to finally() hooks. This mimics Mocha's behavior of before() and
    // after() hooks. A dev-provided exception handler overrides this behavior.
    this._runHooks(this._hooks.before, (e) => {
      if (e) {
        this._failures.push(e)
        this._finish(done)
      } else {
        if (this._waitsMillis > 0) {
          setTimeout(() => { this._makeRequest(done) }, this._waitsMillis)
        } else {
          this._makeRequest(done)
        }
      }
    })
  }


  // Return `true` if should stop processing expectations.
  _noteExpectationFailed (e) {
    if (false === this._exceptionHandler) {
      this._failures.push(e)
      return true
    } else {
      this._exceptionHandler.call(this, e)
      return false
    }
  }


  _makeRequest (done) {
    let requestAlreadyTimedOut = false
    this._attempts.count++

    const maybePerformRetry = () => {
      // Do not retry POST requests.
      if (this._requestArgs.method.toUpperCase() === 'POST') {
        return false
      }

      if (this._attempts.count > this._attempts.maxRetries) {
        return false
      }

      process.stdout.write('R')

      setTimeout(() => {
        this._makeRequest(done)
      }, this._attempts.backoffMillis)

      return true
    }

    const handleRequestTimeout = () => {
      requestAlreadyTimedOut = true

      if (maybePerformRetry()) {
        return
      }

      let message = `Request timed out after ${this._timeout} ms`
      if (this._attempts.count > 1) {
        message += ` (${this._attempts.count} attempts)`
      }
      this._noteExpectationFailed(new Error(message))

      this._finish(done)
    }

    const requestTimeoutId = setTimeout(handleRequestTimeout, this._timeout)

    const start = cb => {
      this.currentRequestFinished = false
      const start = (new Date()).getTime()
      const runCallback = (err, res, body) => {

        if(err) {
          body = "[IcedFrisby] Destination URL may be down or URL is invalid, " + err
        }

        const diff = (new Date()).getTime() - start

        this.currentRequestFinished = {err: err, res: res, body: body, req: outgoing}

        let headers = {}
        if (res) {
          headers = _.mapKeys(res.headers, (value, key) => key.toLowerCase())
        }
        // Store relevant current response parts
        this._response = {
          error: err,
          status: (res ? res.statusCode : 599), // use 599 - network connect timeout error
          headers: headers,
          body: body,
          time: diff
        }

        return cb()
      }

      const { method, uri, params } = this._requestArgs
      let { data } = this._requestArgs

      // Merge 'current' request options for current request
      const outgoing = Object.assign({
        json: params.json || (this.current.request.json || false),
        uri: (this.current.request.baseUri || '') + uri,
        body: params.body || undefined,
        method,
        headers: {},
        timeout: this._timeout,
      }, this.current.request, params)

      outgoing.headers = Object.assign({}, this.current.request.headers, params.headers)

      // Store outgoing request on current Frisby object for inspection in
      // unit tests.
      this._outgoing = outgoing

      // Explicit setting of 'body' param overrides data
      if (params.body) {
        data = params.body
      }

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

      // If the user has provided data, assume that it is query string and set
      // it to the `body` property of the options.
      if (data) {
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
          } else if (!(data instanceof Stream)) {
            outgoing.body = qs.stringify(data)
          }
        }
      }

      if (params.form === true) {
        outgoing.form = true
        outgoing.formData = data
      }

      if (data instanceof Stream) {
        outgoing.stream = data
      }

      let req = null

      // Handle forms (normal data with {form: true} in params options)
      if (outgoing.form === true) {
        const data = outgoing.formData
        delete outgoing.headers['content-type']
        req = this._runner(outgoing, runCallback)
        const form = req.form()
        for (const field in data) {
          form.append(field, data[field])
        }
      } else {
        req = this._runner(outgoing, runCallback)
      }

      if (outgoing.stream && (
        outgoing.method === 'POST' ||
        outgoing.method === 'PUT' ||
        outgoing.method === 'PATCH')) {
        outgoing.stream.pipe(req)
      }
    }

    start(() => {
      if (requestAlreadyTimedOut) {
        return
      }

      clearTimeout(requestTimeoutId)

      if (this._response.status >= 500 && maybePerformRetry()) {
        return
      }

      this._performInspections()
      this._invokeExpects(done)
    })
  }


  _performInspections () {
    this._inspects.forEach(fn => fn())
  }


  // called from makeRequest if request has finished successfully
  _invokeExpects (done) {
    // REQUIRES count for EACH loop iteration (i.e. DO NOT OPTIMIZE THIS LOOP)
    // Some 'expects' helpers add more tests when executed (recursive
    // 'expectJSON' and 'expectJSONTypes', with nested JSON syntax etc.)
    for (let i = 0; i < this._expects.length; i++) {
      try {
        this._expects[i].call(null)
      } catch (e) {
        const shouldStop = this._noteExpectationFailed(e)
        if (shouldStop) {
          break
        }
      }
    }

    this._finish(done)
  }


  // Execute further expects for the current spec (called from _invokeExpects)
  _finish (done) {
    const didPass = this._failures.length === 0,
      didFail = !didPass

    if (didFail && this._outgoing.inspectOnFailure) {
      console.log(`${this.testInfo} has FAILED with the following response:`)
      this.inspectStatus()
      this.inspectJSON()
    }

    const finalizeTest = () => {
      // Return null, sole error, or a MultiError.
      // https://github.com/joyent/node-verror#verrorerrorfromlisterrors
      const retError = errorFromList(this._failures)

      // Finally call done to finish spec.
      done(retError)
    }

    const invokeFinalHooks = () => {
      // Stop after the first error, mimicking Mocha's behavior in after()
      // callbacks.
      this._runHooks(this._hooks.finally, (e) => {
        if (e) {
          this._failures.push(e)
        }

        finalizeTest()
      })
    }

    // Once a failure has occurred, stop running any remaining after() hooks.
    if (didPass && this._hooks.after) {
      this._runHooks(this._hooks.after, (e) => {
        if (e) {
          this._failures.push(e)
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
