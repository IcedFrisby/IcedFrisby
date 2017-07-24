# IcedFrisby API Guide

- [IcedFrisby API Guide](#icedfrisby-api-guide)
	- [Expectations](#expectations)
		- [expectStatus(code)](#expectstatuscode)
		- [expectHeader(key, content)](#expectheaderkey-content)
		- [expectHeaderContains(key, content)](#expectheadercontainskey-content)
		- [expectJSON([path], json)](#expectjsonpath-json)
		- [expectContainsJSON([path], json)](#expectcontainsjsonpath-json)
		- [expectJSONTypes([path], schema)](#expectjsontypespath-schema)
		- [expectBodyContains(content)](#expectbodycontainscontent)
		- [expectJSONLength([path], length)](#expectjsonlengthpath-length)
		- [Using Paths](#using-paths)
			- [Testing Nested Objects](#testing-nested-objects)
			- [Testing All Objects in an Array](#testing-all-objects-in-an-array)
			- [Testing One Object in an Array](#testing-one-object-in-an-array)
	- [useApp()](#useapp)
		- [Example Use:](#example-use)
			- [Express Application:](#express-application)
			- [IcedFrisby Test:](#icedfrisby-test)
	- [Global Setup](#global-setup)
		- [request.baseUri](#requestbaseuri)
		- [request.headers](#requestheaders)
		- [request.json](#requestjson)
		- [request.inspectOnFailure](#requestinspectonfailure)
		- [failOnMultiSetup](#failonmultisetup)
		- [useApp](#useapp-in-globalsetup)
		- [Resetting `globalSetup`](#resetting-globalsetup)
	- [Helpers](#helpers)
		- [before()](#before)
		- [after()](#after)
		- [finally()](#finally)
		- [afterJSON()](#afterjson)
	- [Inspectors](#inspectors)
		- [inspect(cb)](#inspectcb)
		- [inspectRequest(message)](#inspectrequestmessage)
		- [inspectResponse(message)](#inspectresponsemessage)
		- [inspectHeaders(message)](#inspectheadersmessage)
		- [inspectJSON(message)](#inspectjsonmessage)
		- [inspectBody(message)](#inspectbodymessage)
		- [inspectStatus(message)](#inspectstatusmessage)
		- [Send Raw JSON or POST Body](#send-raw-json-or-post-body)

## Expectations

IcedFrisby provides a lot of helper functions to help you check the most common aspects of REST API testing.

Use the expect functions after create() and before toss().
```javascript
frisby.create('a test')
    .expectStatus(200)
    // any number of additional expect statements here
    .toss();
```

### expectStatus(code)
Tests the HTTP response Status code.
* Types: `code`: `integer`
* Default: `none`

```javascript
frisby.create('Ensure we are dealing with a teapot')
  .get('http://httpbin.org/status/418')
    .expectStatus(418)
.toss()
```

### expectHeader(key, content)
Tests that a single HTTP response header matches the [exact content](http://chaijs.com/api/bdd/#equal). Both
key and content comparisons are case-insensitive.

* Types: `key`: `string`, `content`: `string`
* Defaults: `none`

```javascript
frisby.create('Ensure response has a proper JSON Content-Type header')
  .get('http://httpbin.org/get')
    .expectHeader('Content-Type', 'application/json')
.toss();
```

### expectHeaderContains(key, content)
Tests that a single HTTP response header [contains](http://chaijs.com/api/bdd/#include) the specified content. Both key and content comparisons are case-insensitive.

* Types: `key`: `string`, `content`: `string, regex`
* Defaults: `none`

```javascript
frisby.create('Ensure response has JSON somewhere in the Content-Type header')
  .get('http://httpbin.org/get')
    .expectHeaderContains('Content-Type', 'json')
.toss();
```

### expectJSON([path], json)
Tests that response body is JSON and [deeply equals](http://chaijs.com/api/bdd/#deep) the provided JSON.

* Types: `path`: `string`, `json`: `JSON`
* Defaults: `none`

```javascript
frisby.create('Ensure test has foo and bar')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
    .expectJSON('args', {
      args: {
        foo: 'bar',
        bar: 'baz'
      }
    })
.toss()
```

### expectContainsJSON([path], json)
Tests that response body is JSON and [contains a subset](http://chaijs.com/plugins/chai-subset) of the provided JSON.

* Types: `path`: `string`, `json`: `JSON`
* Defaults: `none`

```javascript
frisby.create('Ensure test has foo and bar')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
    .expectContainsJSON('args', {
      foo: 'bar'
    })
.toss()
```

### expectJSONTypes([path], schema)
Validates the response body against the provided [Joi](https://github.com/hapijs/joi) schema.

* Types: `path`: `string`, `schema`: [`Joi schema`](https://github.com/hapijs/joi)
* Defaults: `none`

```javascript
frisby.create('Ensure response has proper JSON types in specified keys')
  .post('http://httpbin.org/post', {
    arr: [1, 2, 3, 4],
    foo: "bar",
    bar: "baz",
    answer: 42
  })
  .expectJSONTypes('args.json', Joi.object().keys({
    arr: Joi.array().items(Joi.number()).required(),
    foo: Joi.string().required(),
    bar: Joi.string().required(),
    answer: Joi.number().integer().required()
  }))
  .toss();
```

### expectBodyContains(content)
Tests that the HTTP response body [contains](http://chaijs.com/api/bdd/#include) the provided content string. Used for testing HTML, text, or other content types.

* Types: `content`: `string, regex`
* Defaults: `none`

```javascript
frisby.create('Ensure this is *actually* a real teapot, not some imposter coffee pot')
  .get('http://httpbin.org/status/418')
    .expectStatus(418)
    .expectBodyContains('teapot')
.toss()
```

### expectJSONLength([path], length)
Tests given path or full JSON response for specified length. When used on objects, the number of keys are counted. When used on other JavaScript types such as Arrays or Strings, the native length property is used for comparison.

* Types: `length`: `integer >= 0`, `string with <, <=, >, >=`
  * `'< 5'`
  * `'<= 5'`
  * `'> 5'`
  * `'<= 5'`
* Defaults: `none`

```javascript
frisby.create('Ensure "bar" really is only 3 characters... because you never know...')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
    .expectJSONLength('args.foo', 3)
.toss()
```

### Using Paths
Paths are used in the following IcedFrisby functions:
* `expectJSON`
* `expectContainsJSON`
* `expectJSONTypes`
* `expectJSONLength`

#### Testing Nested Objects
The path parameter can be used to test a nested JSON object.

```javascript
frisby.create('Ensure response has proper JSON types in specified keys')
  .post('http://httpbin.org/post', {
    answer: 42
  })
  .expectJSONTypes('args.json', Joi.object().keys({
    answer: Joi.number().integer().required()
  }))
  .toss();
```
This example returns a REST response with `{ args: { json: { answer: 42 } } }`. Using a path of `args.json` allows testing of a nested JSON object, `{ answer: 42 }`. This is useful when you don't care about other parts of the response.

#### Testing All Objects in an Array
To test all objects in an array, use an asterisk character, so the path looks like `'args.path.myarray.*'` if the array is at the root level, use `'*'` as the path.

This path mode is often combined with expectJSONTypes to ensure each item in an array contains all required keys and types.

```javascript
  // some request that returns:
  // [
  //   {
  //     number: 5,
  //     string: 'a string'
  //   },
  //   {
  //     number: 6,
  //     string: 'another string'
  //   }
  // ]
  .expectJSONTypes('*', Joi.object().keys({
      number: Joi.number().required(),
      string: Joi.string().required(),
      boolean: Joi.boolean().forbidden()
  }))
.toss();
```
#### Testing One Object in an Array
To test a single object in an array, use an asterisk character, so the path looks like `'args.path.myarray.?'` if the array is at the root level, use `'?'` as the path.

```javascript
// some request that returns:
// [
//   {
//     number: 5
//   },
//   {
//     string: 'a string'
//   }
// ]
  .expectJSONTypes('?', Joi.object().keys({
    string: Joi.string().required()
  })
.toss();
```

## useApp()

IcedFrisby provides the `useApp(app, basePath)` function to bootstrap a Node.js http.Server-based application. Provide your `app` object and IcedFrisby will start the [Express](expressjs.com)/[Koa](koajs.com)/etc application and proceed to test against the application.

This is similar to [supertest's](https://github.com/visionmedia/supertest) request function:
> You may pass an http.Server, or a Function to request() - if the server is not already listening for connections then it is bound to an ephemeral port for you so there is no need to keep track of ports.

This overrides the globalSetup baseUri option for the current test.

:warning: If you are using `useApp()` and [`reset()`](#resetting-globalsetup) in the same test, be sure to use [`reset()`](#resetting-globalsetup) **prior** to calling `useApp()` otherwise the base URL `useApp()` sets will be removed.

:warning: If you are using `useApp()` to override the app used in the global setup, be sure to use `useApp()` prior to calling `get()`, `patch()`, `post()`, `put()`, `delete()`, `head()`, or `options()`. Otherwise, the app will not be overwritten and the app specified in the global setup will be used instead

* Types: `app`: `http.Server`, `basePath`: `string`
* Defaults: `app`: `none`, `basePath`: `''`

### Example Use:

#### Express Application:
```javascript
var express = require('express');
var app = express();

app.get('/', function(req, res) {
    res.send('Hello World!');
});

// prevent the app from starting if it is required as a module (it is in this example!)
if (!module.parent) {
    var server = app.listen(3000, function() {
        var host = server.address().address;
        var port = server.address().port;
        console.log('Example app listening at http://%s:%s', host, port);
    });
}

module.exports = app; // export the application
```

#### IcedFrisby Test:
```javascript
var app = require('./app');

describe('Express app integration', function() {
    frisby.create('should start the app and request')
        .useApp(app)
        .get('/')
        .expectStatus(200)
        .expectBodyContains('Hello World!')
        .toss();
});
```

## Global Setup

`globalSetup()` allows you to define default options for ALL IcedFrisby tests.

:collision: Global setup will affect IcedFrisby tests even across files. It is truly global. Do not call `globalSetup()` more than once unless you know what you are doing.

### request.baseUri
Base URI/URL that will be prepended to every request.
Type: `string`
Default: `''`

```javascript
frisby.globalSetup({
  request: {
    baseUri: 'http://localhost:3000/api/'
  }
});
```

### request.headers
Default headers by providing an object with key-value pairs.
Type: `Object`
Default: `{}`

```javascript
frisby.globalSetup({
  request: {
    headers: { 'Authorization': 'Bearer [...]' }
  }
});
```

### request.json
Sets the `content-type` header to `application/json`.
Type: `boolean`
Default: `false`

```javascript
frisby.globalSetup({
  request: {
    json: true // or false
  }
});
```

### request.inspectOnFailure
This is a really neat option that will help you figure out what is happening with your requests. Dumps request/response information to the logs.
Type: `boolean`
Default: `false`

```javascript
frisby.globalSetup({
  request: {
    inspectOnFailure: true // or false
  }
});
```

### failOnMultiSetup
Enabling the `failOnMultiSetup` option causes IcedFrisby to throw an error if `globalSetup(opts)` is called more than once. We recommend enabling this option. Message:
> IcedFrisby global setup has already been done. Doing so again is disabled (see the failOnMultiSetup option) because it may cause indeterministic behavior.

Type: `boolean`
Default: `false` Disabled by default for backwards compatibility.

```javascript
frisby.globalSetup({
  request: {
    inspectOnFailure: true // or false
  }
});
```

### useApp in globalSetup
Specifying a Node.js http.Server-based application in global setup will apply [useApp()](#useapp) to every test.

``` javascript
frisby.globalSetup({
    useApp: require('./myApp.js')
});

```

### Resetting `globalSetup`
Resets the `globalSetup` settings for the current test.

```javascript
frisby.create('Request without the globalSetup options')
  .reset() // reset the globalSetup options
  .get(...)
  ...
```

## Helpers

### before()
Callback function to run before the tested request is executed. Can be used to set up a test environment or even to launch a server. If an argument is provided, it is assumed to be a callback function, similar to Mocha's before(). Useful for writing plugins. Multiple registered functions are run in order of registration.

```javascript
frisby.create('Upcheck test')
  .before(function() { this._pluginContext = 123 })
  .before(function(done) { http.createServer().listen(80, done) })
  .get('http://localhost/upCheck')
  .expectStatus(200)
  .toss()
```

### after()
Callback function to run after test is completed successfully. Can be used to run tests sequentially. If an extra argument is provided, it is assumed to be a callback function, similar to Mocha's `after()`. Multiple registered functions are run in order of registration.

```javascript
frisby.create('First test')
  .get('http://httpbin.org/get?foo=bar')
  .after(function(err, res, body, done) {
    // async, don't forget to invoke done()
    setImmediate(done)
  })
  .after(function(err, res, body) {

    frisby.create('Second test, run after first is completed')
      .get('http://httpbin.org/get?bar=baz')
    .toss()

  })
.toss()
```

### finally()
Callback function to run after test is done, either successfully or not. Can be used to tear down a test context established with `before()`. If an extra argument is provided, it is assumed to be a callback function, similar to Mocha's `after()`. Useful for writing plugins. Multiple registered functions are run in order of registration.

```javascript
frisby.create('First test')
  .get('http://httpbin.org/get?foo=bar')
  .finally(function() {
    // sync
  })
  .finally(function(done) {
    // async, don't forget to invoke done()
    setImmediate(done)
  })
.toss()
```

### afterJSON()
Callback function to run after test is completed. This helper function automatically converts the response body to JSON.

```javascript
frisby.create('First test')
  .get('http://httpbin.org/get?foo=bar')
  afterJSON(function(json) {

    // Now you can use 'json' in additional requests
    frisby.create('Second test, run after first is completed')
      .get('http://httpbin.org/get?bar=' + json.args.foo)
    .toss()

  });
.toss()
```

## Inspectors
Inspectors are useful for viewing details about HTTP requests and responses in the console.

### inspect(cb)
Provides access to request and response data before expectations are executed. This should not be used for assertions. Use [after()](https://github.com/RobertHerhold/IcedFrisby/blob/master/API.md#after) for more assertions.
* Types: `cb`: `function(err, req, res, body, headers)`
  - callback types:
    * `err`: `Error` object is there was an error making the request. Will be `null` if no error is present.
	* `req`: request `object` IcedFrisby made to the endpoint
	* `res`: response `object` received from the endpoint
	* `body`: body `object`, a part of the response
	* `headers`: headers `object`, a part of the response
* Defaults: `none`, performs no action if the callback is a false value

```javascript
frisby.create('Inspecting some data')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
  .inspect(function(err, req, res, body, headers) {
	console.log('Got args:' + body.args);
})
.toss()
```

### inspectRequest(message)
Inspects the entire request object sent from IcedFrisby.
* Types: `message`: `string` An optional message to print before the inspection
* Defaults: `none`

```javascript
frisby.create('Just a quick inspection of the JSON HTTP response')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
  .inspectRequest()
  .toss()
```

### inspectResponse(message)
Inspects the entire response.
* Types: `message`: `string` An optional message to print before the inspection
* Defaults: `none`

```javascript
frisby.create('Just a quick inspection of the JSON HTTP response')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
  .inspectResponse()
  .toss()
```

### inspectHeaders(message)
Inspects the response headers.
* Types: `message`: `string` An optional message to print before the inspection
* Defaults: `none`

```javascript
frisby.create('Just a quick inspection of the JSON HTTP response')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
  .inspectHeaders()
  .toss()
```

Console output:
```json
{ server: 'nginx',
  date: 'Sun, 17 May 2015 02:38:21 GMT',
  'content-type': 'application/json',
  'content-length': '188',
  connection: 'close',
  'access-control-allow-origin': '*',
  'access-control-allow-credentials': 'true' }
```

### inspectJSON(message)
Dumps parsed JSON body to the console.
* Types: `message`: `string` An optional message to print before the inspection
* Defaults: `none`

```javascript
frisby.create('Just a quick inspection of the JSON HTTP response')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
  .inspectJSON()
  .toss()
```

Console output:
```javascript
{ url: 'http://httpbin.org/get?foo=bar&bar=baz',
  headers:
   { 'Content-Length': '',
     'X-Forwarded-Port': '80',
     Connection: 'keep-alive',
     Host: 'httpbin.org',
     Cookie: '',
     'Content-Type': 'application/json' },
  args: { foo: 'bar', bar: 'baz' },
  origin: '127.0.0.1' }
```

### inspectBody(message)
Dumps the raw response body to the console without any parsing.
* Types: `message`: `string` An optional message to print before the inspection
* Defaults: `none`

```javascript
// Test
frisby.create('Very useful for HTML, text, or raw output')
  .get('http://asciime.heroku.com/generate_ascii?s=Frisby.js')
  .inspectBody()
  .toss()
```

Console output:
```
  ______    _     _             _
 |  ____|  (_)   | |           (_)
 | |__ _ __ _ ___| |__  _   _   _ ___
 |  __| '__| / __| '_ \| | | | | / __|
 | |  | |  | \__ \ |_) | |_| |_| \__ \
 |_|  |_|  |_|___/_.__/ \__, (_) |___/
                         __/ |_/ |
                        |___/|__/
```

### inspectStatus(message)
Inspects the response status.
* Types: `message`: `string` An optional message to print before the inspection
* Defaults: `none`

```javascript
frisby.create('Just a quick inspection of the JSON HTTP response')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
  .inspectStatus()
  .toss()
```

### Send Raw JSON or POST Body
By default, IcedFrisby sends POST and PUT requests as `application/x-www-form-urlencoded` parameters. If you want to send a raw request body or actual JSON, use `{ json: true }` as the third argument (object literal of options).

```javascript
frisby.create('Post JSON string as body')
    .post('http://httpbin.org/post', {
        arr: [1, 2, 3, 4],
        foo: "bar",
        bar: "baz",
        answer: 42
    }, {json: true})
    .expectHeaderContains('Content-Type', 'json')
.toss()
```
