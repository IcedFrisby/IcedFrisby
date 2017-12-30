# IcedFrisby API Guide

- [IcedFrisby API Guide](#icedfrisby-api-guide)
  - [The Basics](#thebasics)
    - [create(msg)](#createmsg)
    - [toss()](#toss)
    - [config()](#configopts)
  - [Commands](#commands)
    - [get(uri,params)](#geturi-params)
    - [head(uri,params)](#headuri-params)
    - [options(uri,params)](#optionsuri-params)
    - [post(uri,data,params)](#posturi-data-params)
    - [put(uri,data,params)](#puturi-data-params)
    - [patch(uri,data,params)](#patchuri-data-params)
    - [delete(uri,data,params)](#deleteuri-data-params)
    - [addHeader(header,content)](#addheaderheader-content)
    - [addHeaders(headers)](#addheadersheaders)
    - [removeHeader(header)](#removeheaderheader)
    - [auth(username,password,isDigest)](#authusername-password-isdigest)
  - [Expectations](#expectations)
    - [expectStatus(code)](#expectstatuscode)
    - [expectHeader(key, content, options)](#expectheaderkey-content-options)
    - [expectNoHeader(key)](#expectnoheaderkey)
    - [expectHeaderContains(key, content, options)](#expectheadercontainskey-content-options)
    - [expectJSON([path], json)](#expectjsonpath-json)
    - [expectContainsJSON([path], json)](#expectcontainsjsonpath-json)
    - [expectJSONTypes([path], schema)](#expectjsontypespath-schema)
    - [expectBodyContains(content)](#expectbodycontainscontent)
    - [expectJSONLength([path], length)](#expectjsonlengthpath-length)
    - [expectMaxResponseTime(ms)](#expectmaxresponsetimems)
    - [not()](#not)
    - [Using Paths](#using-paths)
      - [Testing Nested Objects](#testing-nested-objects)
      - [Testing All Objects in an Array](#testing-all-objects-in-an-array)
      - [Testing One Object in an Array](#testing-one-object-in-an-array)
  - [useApp()](#useapp)
    - [Example Use:](#example-use)
      - [Express Application:](#express-application)
      - [IcedFrisby Test:](#icedfrisby-test)
  - [Helpers](#helpers)
    - [before()](#before)
    - [after()](#after)
    - [finally()](#finally)
    - [afterJSON()](#afterjson)
    - [only()](#only)
    - [timeout(ms)](#timeoutms)
    - [retry(count, backoff)](#retrycount-backoff)
    - [baseUri(uri)](#baseuriuri)
    - [waits(ms)](#waitsms)
    - [exceptionHandler(function)](#exceptionhandlerfunction)
  - [Inspectors](#inspectors)
    - [inspect(cb)](#inspectcb)
    - [inspectRequest(message)](#inspectrequestmessage)
    - [inspectResponse(message)](#inspectresponsemessage)
    - [inspectHeaders(message)](#inspectheadersmessage)
    - [inspectJSON(message)](#inspectjsonmessage)
    - [inspectBody(message)](#inspectbodymessage)
    - [inspectStatus(message)](#inspectstatusmessage)
    - [Send Raw JSON or POST Body](#send-raw-json-or-post-body)

## The Basics

Every frisby request begins with `create(..)` and ends with a `toss()`.

### create(msg)

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| msg | A string used to name the test when it's wrapped in mocha for execution at runtime | Yes |

Used to create an instance of IcedFrisby that is used to send 1 request and receive the response.

```javascript
frisby.create('a test')
    .get('http://example.com')
    .expectStatus(200)
    // any number of additional expect statements here
    .toss();
```

### toss()

Complete the list of commands and register the test with Mocha.

```javascript
frisby.create('a test')
    .get('http://example.com')
    .expectStatus(200)
    // any number of additional expect statements here
    .toss();
```

### config(opts)

Set configuration options on this instance.

- `inspectOnFailure` (boolean): This is a really neat option that will help you figure out what is happening with your requests. Dumps request/response information to the logs.
- `json` (boolean): Sets body to JSON representation of value and adds Content-type: application/json header. Additionally, parses the response body as JSON.

```javascript
frisby.create('...').get('...').config({ inspectOnFailure: true })
```

## Commands

These are the commands you'll need to get IcedFrisby talking HTTP.

An optional parameters object is accepted by each of these methods. All object parameters are optional.

```javascript
{
  json: 'boolean',         //Whether this will be a JSON body. Overrides value set in globalSetup().
  body: 'string'|'object', //The body to include in the outbound request. This overrides "data" if provided in method call.
  mock: 'function',        //A mock runner to use. When not provided, uses "request" (i.e. does it for real).
  form: 'boolean'          //Use the object in the body to create a form-encoded request.
}
```

### get(uri, params)

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| uri | The URI/URL being requested | Yes |
| params | An optional params object, as described above | No |

Perform an HTTP GET on the specified URI.

```javascript
frisby.create('a test')
    .get('http://example.com/login')
    .expectStatus(200)
    // any number of additional expect statements here
    .toss();
```

### head(uri, params)

Identical to [get](#geturi-params), using an HTTP HEAD request.

### options(uri, params)

Identical to [get](#geturi-params), using an HTTP OPTIONS request.

### post(uri, data, params)

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| uri | The URI string | Yes |
| data | The data to post. An object when `{ json: true }` or `{ form: true }`, or else a data string / buffer. | Yes |
| params | An optional params object, as described above. | No |

Perform an HTTP POST to the specified URI.

```javascript
frisby.create('a test')
    .post('http://example.com/account', {
      username: 'joe@example.com',
      password: 'J0£_£x@mpl£'
    })
    .expectStatus(200)
    // any number of additional expect statements here
    .toss();

frisby.create('another test')
    .post('http://example.com/contact-us', {
      name: 'Test Person',
      comment: 'What a lovely test'
    }, {form: true})
    .expectStatus(200)
    // any number of additional expect statements here
    .toss();

```

### put(uri, data, params)

Identical to [post](#posturi-params), using an HTTP PUT request.

### patch(uri, data, params)

Identical to [post](#posturi-params), using an HTTP PATCH request.

### delete(uri, data, params)

Identical to [post](#posturi-params), using an HTTP DELETE request.

### addHeader(header, content)

Adds an HTTP header to your request

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| header | String giving the name of the header. Case insensitive. | Yes |
| content | String giving the value of the given header. Case sensitive. | Yes |

Note that `content` is always a string, regardless of whether the data it would represent is something else (an integer or GUID for example).

This method can be repeated for the same `header` value, replacing (not duplicating) the header on each successive call.

```javascript
frisby.create('a test')
    .get('http://example.com')
    .addHeader('Accept', 'text/html')
    .expectStatus(200)
    // any number of additional expect statements here
    .toss();
```

### addHeaders(headers)

Adds a collection of headers to your request

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| headers | A flat object where each key becomes a header name and each corresponding value becomes that header's value in the request. As per HTTP spec, all header names are case-insensitive. | Yes |

```javascript
frisby.create('a test')
    .get('http://example.com')
    .addHeaders({
      accept: 'text/html',
      referer: 'http://www.test.net'
    })
    .expectStatus(200)
    // any number of additional expect statements here
    .toss();
```

### removeHeader(header)

Removes a given header from the outgoing request.

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| header | String giving the name of the header to be removed | Yes |

```javascript
frisby.create('Request with stripped headers')
    .get('http://example.com')
    .removeHeader('Content-Type')
    .toss()
```

In this example, the Content-Type is always set by IcedFrisby, but the test developer doesn't want to send it so they can validate whether their API is resilient to such things.

### auth(username,password,isDigest)

Sets the basic auth header for the request.

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| username | String | Yes |
| password | String | Yes |
| isDigest | Boolean. Defaults to `false`. <br>When given and `true`, will configure IcedFrisby to send the request initially without the auth header, then repeat the request with the auth header when challenged with an HTTP/401 that has a `WWW-Authenticate` header | No |

```javascript
frisby.create('Get secret things')
   .get('http://example.com/secret/things')
   .auth('bob','letmein')
   .expectStatus(200)
   .toss()
```

As an alternative, you can use `http://username:password@example.com`.

## Expectations

IcedFrisby provides a lot of helper functions to help you check the most common aspects of REST API testing.

Use the expect functions after create() and before toss().

```javascript
frisby.create('a test')
    .get('http://example.com')
    .expectStatus(200)
    // any number of additional expect statements here
    .toss();
```

### expectStatus(code)

Tests the HTTP response Status code.

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| code | Integer representing the HTTP status code expected to be on the response. | Yes |

```javascript
frisby.create('Ensure we are dealing with a teapot')
  .get('http://httpbin.org/status/418')
  .expectStatus(418)
.toss()
```

Note: IcedFrisby represents all network timeouts as a response of HTTP/599.

### expectHeader(key, content, options)

Tests that a single HTTP response header has the [exact content](http://chaijs.com/api/bdd/#equal) or [matches](http://chaijs.com/api/bdd/#method_match) a regex. Key comparisons are case-insensitive. Content comparisons are case-insensitive for strings, case-sensitive for regular expressions.

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| key | String. Name of the header. | Yes |
| content | String or RegExp to be matched. | Yes |
| options | Object. When containing `allowMultipleHeaders: true`, will check each parameter with this name and succeed if 1 or more matches. <br>By default, multiple headers containing this name will raise an error. | No |

String example:

```javascript
frisby.create('Ensure response has a proper JSON Content-Type header')
  .get('http://httpbin.org/get')
  .expectHeader('Content-Type', 'application/json')
.toss();

frisby.create('Ensure response has JSON somewhere in the Content-Type header via regex')
  .get('http://httpbin.org/get')
  .expectHeader('Content-Type', /.*json.*/)
.toss();

frisby.create('Ensure response returns one cookie called "auth"')
  .post('http://example.com/login', {username: admin, password: example})
  .expectHeader('Set-Cookie', /^auth=/, {allowMultipleHeaders: true})
.toss();
```

For backwards compatibility, `expectHeaderToMatch(key, pattern)` is an alias for this function (but does not accept the options parameter).

### expectNoHeader(key)

Tests that a specific HTTP header was not received in the response

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| key | String. Name of the header. | Yes |

```javascript
frisby.create('Ensure response has no Set-Cookie header')
  .get('http://httpbin.org/get')
  .expectNoHeader('Set-Cookie')
.toss();
```

### expectHeaderContains(key, content, options)

Tests that a single HTTP response header [contains](http://chaijs.com/api/bdd/#method_include) the specified content. Both key and content comparisons are case-insensitive.

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| key | String. Name of the header. | Yes |
| content | String to be matched. | Yes |
| options | Object. When containing `allowMultipleHeaders: true`, will check each parameter with this name and succeed if 1 or more matches. <br>By default, multiple headers containing this name will raise an error. | No |

```javascript
frisby.create('Ensure response has JSON somewhere in the Content-Type header')
  .get('http://httpbin.org/get')
  .expectHeaderContains('Content-Type', 'json')
.toss();

frisby.create('Ensure response returns one cookie called "auth"')
  .post('http://example.com/login', {username: admin, password: example})
  .expectHeader('Set-Cookie', 'auth=', {allowMultipleHeaders: true})
.toss();
```

### expectJSON([path], json)

Tests that response body is JSON and [deeply equals](http://chaijs.com/api/bdd/#deep) the provided JSON.

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| path | String. Path to the the subset of the response JSON to be tested. | No |
| json | Object. The JSON to test against. | Yes |

For info on the path parameter, see [Using Paths](#using-paths).

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

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| path | String. Path to the the subset of the response JSON to be tested. | No |
| json | Object. The JSON to test against. | Yes |

For info on the path parameter, see [Using Paths](#using-paths).

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

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| path | String. Path to the the subset of the response JSON to be tested. | No |
| schema | [`Joi schema`](https://github.com/hapijs/joi) that the response JSON should conform to. | Yes |

For info on the path parameter, see [Using Paths](#using-paths).

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

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| content | String or RegExp that the body will be tested against | Yes |

```javascript
frisby.create('Ensure this is *actually* a real teapot, not some imposter coffee pot')
  .get('http://httpbin.org/status/418')
    .expectStatus(418)
    .expectBodyContains('teapot')
.toss()
```

### expectJSONLength([path], length)

Tests given path or full JSON response for specified length. When used on objects, the number of keys are counted. When used on other JavaScript types such as Arrays or Strings, the native length property is used for comparison.

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| length | Integer representing expected length, e.g. `3` <br>OR <br>String reprenting a condition, e.g. `>10`. Can be any of `<`, `<=`, `>`, `>=` | Yes |

```javascript
frisby.create('Ensure "bar" really is only 3 characters... because you never know...')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
    .expectJSONLength('args.foo', 3)
.toss()
```

### expectMaxResponseTime(ms)

Tests that the HTTP response arrives within a given number of milliseconds

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| ms | Integer representing number of milliseconds as the max threshold for the response | Yes |

```javascript
frisby.create('Ensure response arrives within two seconds')
  .get('http://httpbin.org/get')
  .expectMaxResponseTime(2000)
  .toss()
```

### not()

Negates all `expectJSON`, `expectJSONTypes`, `expectContainsJSON` and `expectJSONLength` expects in this test, inverting the logic to expect the opposite, e.g. JSON doesn't contain this.

```javascript
frisby.create('Check deleted item no longer exists')
  .get('http://example.com/things/list')
  .not().expectContainsJSON('*', { name: 'Jane Doe' })
.toss()
```

### Using Paths

Paths are used in the following IcedFrisby functions:

- `expectJSON`
- `expectContainsJSON`
- `expectJSONTypes`
- `expectJSONLength`

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

To test all objects in an array, use an asterisk character, so the path looks like `'args.path.myarray.*'`. If the array is at the root level, use `'*'` as the path.

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

To test a single object in an array, use a question mark character, so the path looks like `'args.path.myarray.?'`. If the array is at the root level, use `'?'` as the path.

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

- Types: `app`: `http.Server`, `basePath`: `string`
- Defaults: `app`: `none`, `basePath`: `''`

### Example Use

#### Express Application

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

#### IcedFrisby Test

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
  .after(function(err, res, body, headers, done) {
    // async, don't forget to invoke done()
    setImmediate(done)
  })
  .after(function(err, res, body, headers) {

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
  .afterJSON(function(json) {

    // Now you can use 'json' in additional requests
    frisby.create('Second test, run after first is completed')
      .get('http://httpbin.org/get?bar=' + json.args.foo)
    .toss()

  });
.toss()
```

### only()

Exclusively run this test. When `toss()` is invoked, the test is wrapped in a
Mocha `describe.only` block instead of a `describe` block.

### timeout(ms)

Sets the timeout for this request.

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| ms | Integer. Sets the timeout for this individual request. | Yes |

```javascript
frisby.create('Long-running request')
    .get('http://example.com/slowthing')
    .timeout(5000)
    .expectStatus(200)
    .toss()
```

When a timeout occurs, the test will be aborted. The expectations and inspections may or may not run and will not be printed. If you want to run all the expectations and inspections even when the response is slow, use [expectMaxResponseTime](#expectmaxresponsetimems) instead.

If this were used in conjunction with retries, each retry would have this configured timeout.

This function can also be called with no parameter to return the current configured timeout (either by default, by global setup or having used this function with a parameter previously).

### retry(count, backoff)

Set the number of (and additional backoff between) retries for this test. Each retry will be the configured timeout plus (retry number x backoff) apart.

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| count | Integer. Number of times to retry (meaning that 0 is still a single attempt) | Yes |
| backoff | Integer. Number of milliseconds to add to the wait between each successive retry. Defaults to 1000ms. | No |

```javascript
frisby.create('Get a flaky thing')
    .get('http://example.com/thing-that-sometimes-responds')
    .expectStatus(200)
    .retry(2, 250)
    .toss()
```

In this above example, this makes two retries, for a total of three attempts, waiting 250 ms between them. For each attempt, the timeout resets to 5000 ms (the default).

### baseUri(uri)

Set the root URI/URL that will be prepended to every request, replacing anything set by `request.baseUri` in global setup.

```javascript
frisby.create('Simple Get')
  .baseUri('http://httpbin.org')
  .get('/get?foo=bar')
  .expectStatus(200)
.toss()
```

### waits(ms)

Sets a period of time in milliseconds to wait after the test starts (and any [before()](#before) hook processing) until the request is sent. This can allow time for server-side processing between chained requests.

```javascript
const myUser = {name: 'Jane Doe'}
frisby.create('Create Item')
    .post('http://example.com/users/create', myUser)
    .after(function(err, res, body, headers) {
        frisby.create('Check Item Exists')
            .get('http://example.com/users/list')
            .waits(500)
            .expectJSON('?', myUser)
            .toss()
    })
    .toss()
```

### exceptionHandler(function)

Sets a function to run if an error is raised. Can be used to output additional debug info not covered by the [inspectors](#inspectors), or perhaps to add validation to a non-deterministic result.

```javascript
frisby.create('Expecting something from nothing')
    .get('http://example.com/empty')
    .expectBodyContains('foo')
    .exceptionHandler(err => {
        expect(err).to.be.an.instanceof(AssertionError) //Asserts that this came from a failing "expect" function
        expect(err.message).to.equal("expected '' to include 'foo'")
    })
    .toss()
```

## Inspectors

Inspectors are useful for viewing details about HTTP requests and responses in the console.

Note that `.config({ inspectOnFailure: true })` is a really neat option that will help you figure out what is happening with your requests. Dumps request/response information to the logs.

### inspect(cb)

Provides access to request and response data before expectations are executed. This should not be used for assertions. Use [after()](https://github.com/RobertHerhold/IcedFrisby/blob/master/API.md#after) for more assertions.

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| cb | Callback `function` to be called before any expects are run. <br>Signature: `function(err, req, res, body, headers){..}` | Yes |

Callback Parameters:

| Parameter | Description |
| --------- | ----------- |
| err | `Error` object if there was an error making the request. Will be `null` if no error is present. |
| req | request `object` IcedFrisby made to the endpoint |
| res | response `object` received from the endpoint |
| body | body `object` (a part of the response) |
| headers | headers `object` (a part of the response) |

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

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| message | An optional to print before the inspection | No |

```javascript
frisby.create('Just a quick inspection of the JSON HTTP response')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
  .inspectRequest()
  .toss()
```

### inspectResponse(message)

Inspects the entire response.

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| message | An optional to print before the inspection | No |

```javascript
frisby.create('Just a quick inspection of the JSON HTTP response')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
  .inspectResponse()
  .toss()
```

### inspectHeaders(message)

Inspects the response headers.

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| message | An optional to print before the inspection | No |

```javascript
frisby.create('Just a quick inspection of the JSON HTTP response')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
  .inspectHeaders()
  .toss()
```

Console output:

```text
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

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| message | An optional to print before the inspection | No |

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

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| message | An optional string to print before the inspection | No |

```javascript
// Test
frisby.create('Very useful for HTML, text, or raw output')
  .get('http://asciime.heroku.com/generate_ascii?s=Frisby.js')
  .inspectBody()
  .toss()
```

Console output:

```text
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

| Parameter | Description | Required |
| --------- | ----------- | -------- |
| message | An optional string to print before the inspection | No |

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
