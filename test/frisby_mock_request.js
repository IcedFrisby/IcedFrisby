var nock = require('nock');
var fixtures = require('./fixtures/repetition_fixture.json');
var frisby = require('../lib/icedfrisby');
var mockRequest = require('mock-request');
var Joi = require('joi');
const AssertionError = require('chai').AssertionError;

// Built-in node.js
var fs = require('fs');
var path = require('path');

// enable real connections for localhost otherwise useApp() tests won't work
nock.enableNetConnect('127.0.0.1');

// Test global setup

var mockGlobalSetup = function() {
  frisby.globalSetup({
    timeout: 3000,
    request: {
      headers: {
        'Test'   : 'One',
        'Referer': 'http://frisbyjs.com'
      }
    }
  });
};

var restoreGlobalSetup = function() {
  frisby.globalSetup({
    request: {
      headers: {},
      inspectOnFailure: false,
      json: false,
      baseUri: ''
    }
  });
};

// Nock to intercept HTTP upload request
var mock = nock('http://httpbin.org', { allowUnmocked: true })
  .post('/file-upload')
  .reply(200, {
    name: 'Test Upload',
    file: '/some/path/logo-frisby.png'
  })
  .post('/raw')
  .reply(200, function(uri, requestBody) {
    return requestBody;
  });


//
// Tests run like normal Frisby specs but with 'mock' specified with a 'mock-request' object
// These work without further 'expects' statements because Frisby generates and runs Jasmine tests
//
describe('Frisby matchers', function() {

  it('expectStatus for mock request should return 404', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/not-found')
      .respond({
        statusCode: 404
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/not-found', {mock: mockFn})
      .expectStatus(404)
      .toss();
  });

  it('globalSetup should set timeout to 3000', function() {
    mockGlobalSetup();
    var f1 = frisby.create(this.test.title);
    expect(f1.timeout()).to.equal(3000);
    restoreGlobalSetup();
  });

  it('globalSetup should set local request headers', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    mockGlobalSetup();
    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .after(function(err, res, body) {
        expect(this.current.outgoing.headers['test']).to.equal('One');
        expect(this.current.outgoing.headers['referer']).to.equal('http://frisbyjs.com');
      })
      .toss();
    restoreGlobalSetup();
  });

  it('addHeaders should override globalSetup request headers', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    mockGlobalSetup();
    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .addHeaders({ 'Test': 'Two' })
      .after(function(err, res, body) {
        // Local addHeaders should override global
        expect(this.current.outgoing.headers['test']).to.equal('Two');
      })
      .toss();
    restoreGlobalSetup();
  });

  it('addHeaders should override globalSetup request headers and not taint other Frisby tests', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array-ex')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();
    var mockFn2 = mockRequest.mock()
    .get('/test-object-array-ex2')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    mockGlobalSetup();

    var f1 = frisby.create(this.test.title + ' - mock test one')
      .get('http://mock-request/test-object-array-ex', {mock: mockFn})
      .addHeaders({ 'Test': 'Two' })
      .after(function(err, res, body) {
        // Local addHeaders should override global
        expect(this.current.outgoing.headers['test']).to.equal('Two');
      })
    .toss();

    var f2 = frisby.create(this.test.title + ' - mock test two')
      .get('http://mock-request/test-object-array-ex2', {mock: mockFn2})
      .addHeaders({ 'Test': 'Three' })
      .after(function(err, res, body) {
        // Local addHeaders should override global
        expect(this.current.outgoing.headers['test']).to.equal('Three');
      })
    .toss();

    restoreGlobalSetup();
  });

  describe('before callbacks', function () {
    it('should be invoked in sequence before the request', function() {
      const sequence = [];

      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
            statusCode: 200,
            body: fixtures.singleObject
        })
        .run();
      const requestFn = function () {
        sequence.push('request');
        return mockFn.apply(this, arguments);
      };

      frisby.create(this.test.title)
        .before(() => { sequence.push('before-one'); })
        .before(() => { sequence.push('before-two'); })
        .get('http://mock-request/test-object', {mock: requestFn})
        .after(() => {
          const expectedSequence = ['before-one', 'before-two', 'request'];
          expect(sequence).to.deep.equal(expectedSequence);
        })
        .toss();
    });

    it('should respect the exception handler', function() {
      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
            statusCode: 200,
            body: fixtures.singleObject
        })
        .run();

      const message = 'this is the error';

      frisby.create(this.test.title)
        .before(() => { throw new Error(message); })
        .get('http://mock-request/test-object', {mock: mockFn})
        .exceptionHandler(err => {
          expect(err.message).to.equal(message);
        })
        .toss();
    });
  });

  it('expectJSON should test EQUALITY for a SINGLE object', function() {
      // Mock API
      var mockFn = mockRequest.mock()
      .get('/test-object')
      .respond({
          statusCode: 200,
          body: fixtures.singleObject
      })
      .run();

      frisby.create(this.test.title)
      .get('http://mock-request/test-object', {mock: mockFn})
      .expectJSON({
          test_str: "Hey Hai Hello",
          test_str_same: "I am the same...",
          test_int: 1,
          test_optional: null
      })
      .toss();
  });

  it('expectJSON should test INEQUALITY for a SINGLE object', function() {
      // Mock API
      var mockFn = mockRequest.mock()
      .get('/test-object')
      .respond({
          statusCode: 200,
          body: fixtures.singleObject
      })
      .run();

      frisby.create(this.test.title)
      .get('http://mock-request/test-object', {mock: mockFn})
      .not().expectJSON({
          test_str: "Bye bye bye!",
          test_str_same: "I am not the same...",
          test_int: 9,
          test_optional: true
      })
      .toss();
  });

  it('expectJSON should test EQUALITY for EACH object in an array with an asterisk path', function() {
      // Mock API
      var mockFn = mockRequest.mock()
      .get('/test-array')
      .respond({
          statusCode: 200,
          body: fixtures.sameNumbers
      })
      .run();

      frisby.create(this.test.title)
      .get('http://mock-request/test-array', {mock: mockFn})
      .expectJSON('*', { num: 5 })
      .toss();
  });

  it('expectJSON should test INEQUALITY for EACH object in an array with an asterisk path', function() {
      // Mock API
      var mockFn = mockRequest.mock()
      .get('/test-array')
      .respond({
          statusCode: 200,
          body: fixtures.sameNumbers
      })
      .run();

      frisby.create(this.test.title)
      .get('http://mock-request/test-array', {mock: mockFn})
      .not().expectJSON('*', { num: 123 })
      .toss();
  });

  it('expectJSON should test EACH object in an array with path ending with asterisk', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONTypes('test_subjects.*', { // * == EACH object in here should match
        test_str_same: Joi.string().valid("I am the same..."),
        test_int: Joi.number(),
        test_str: Joi.string(),
        test_optional: Joi.any().optional()
      })
      .toss();
  });

  it('expectJSON should match ONE object in an array with path ending with question mark', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONTypes('test_subjects.?', { // ? == ONE object in here should match (contains)
        test_str_same: Joi.string().valid("I am the same..."),
        test_int: Joi.number().valid(43),
        test_str: Joi.string().valid("I am a string two!"),
        test_optional: Joi.any().optional()
      })
      .toss();
  });

  it('expectJSON should NOT match ONE object in an array with path ending with question mark', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .not().expectJSON('test_subjects.?', { // ? == ONE object in 'test_subjects' array
        test_str: "I am a string two nonsense!",
        test_int: 4433
      })
      .toss();
  });

  it('expectContainsJSON should MATCH fields for a SINGLE object', function() {
      // Mock API
      var mockFn = mockRequest.mock()
      .get('/test-object')
      .respond({
          statusCode: 200,
          body: fixtures.singleObject
      })
      .run();

      frisby.create(this.test.title)
      .get('http://mock-request/test-object', {mock: mockFn})
      .expectContainsJSON({
          test_str: "Hey Hai Hello",
          // test_str_same: "I am the same...", // leave this out of the orig object, should still match
          test_int: 1,
          test_optional: null
      })
      .toss();
  });

  it('expectContainsJSON should NOT MATCH for a SINGLE object', function() {
      // Mock API
      var mockFn = mockRequest.mock()
      .get('/test-object')
      .respond({
          statusCode: 200,
          body: fixtures.singleObject
      })
      .run();

      frisby.create(this.test.title)
      .get('http://mock-request/test-object', {mock: mockFn})
      .not().expectContainsJSON({
          test_str: "Bye bye bye!",
          test_str_same: "I am not the same...",
          test_int: 9,
          test_optional: true
      })
      .toss();
  });

  it('expectContainsJSON should NOT MATCH for a SINGLE object with a single field', function() {
      // Mock API
      var mockFn = mockRequest.mock()
      .get('/test-object')
      .respond({
          statusCode: 200,
          body: fixtures.singleObject
      })
      .run();

      frisby.create(this.test.title)
      .get('http://mock-request/test-object', {mock: mockFn})
      .not().expectContainsJSON({
          test_str: "Bye bye bye!",
          // test_str_same: "I am not the same...",
          // test_int: 9,
          // test_optional: true
      })
      .toss();
  });

  it('expectContainsJSON should MATCH for EACH object in an array with an asterisk path', function() {
      // Mock API
      var mockFn = mockRequest.mock()
      .get('/test-array')
      .respond({
          statusCode: 200,
          body: fixtures.sameNumbers
      })
      .run();

      frisby.create(this.test.title)
      .get('http://mock-request/test-array', {mock: mockFn})
      .expectContainsJSON('*', { num: 5 })
      .toss();
  });

  it('expectContainsJSON should NOT MATCH for EACH object in an array with an asterisk path', function() {
      // Mock API
      var mockFn = mockRequest.mock()
      .get('/test-array')
      .respond({
          statusCode: 200,
          body: fixtures.sameNumbers
      })
      .run();

      frisby.create(this.test.title)
      .get('http://mock-request/test-array', {mock: mockFn})
      .not().expectContainsJSON('*', { num: 123 })
      .toss();
  });

  it('expectContainsJSON should MATCH for EACH object in an array with path ending with asterisk', function() {
      // Mock API
      var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
          statusCode: 200,
          body: fixtures.arrayOfObjects
      })
      .run();

      var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectContainsJSON('test_subjects.*', { // * == EACH object in here should match
          test_str_same: "I am the same...",
      })
      .toss();
  });

  it('expectContainsJSON should MATCH ONE object in an array with path ending with question mark', function() {
      // Mock API
      var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
          statusCode: 200,
          body: fixtures.arrayOfObjects
      })
      .run();

      var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectContainsJSON('test_subjects.?', { // ? == ONE object in here should match (contains)
          test_str: "I am a string two!",
      })
      .toss();
  });

  it('expectContainsJSON should NOT MATCH ONE object in an array with path ending with question mark', function() {
      // Mock API
      var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
          statusCode: 200,
          body: fixtures.arrayOfObjects
      })
      .run();

      var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .not().expectContainsJSON('test_subjects.?', { // ? == ONE object in 'test_subjects' array
          test_str: "I am a string two nonsense!",
      })
     .toss();
  });

  it('expectJSONTypes should NOT match ONE object in an array with path ending with question mark', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .not().expectJSONTypes('test_subjects.?', { // ? == ONE object in 'test_subjects' array
        test_str: Joi.boolean(),
        test_int: Joi.string()
      })
      .toss();
  });

  it('expectJSONLength should properly count arrays, strings, and objects', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects', 3)
      .expectJSONLength('test_subjects.0', 4)
      .expectJSONLength('some_string', 9)
      .toss();
  });

  it('expectJSONLength should support an asterisk in the path to test all elements of an array', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', 4)
      .toss();
  });

  it('expectJSONLength should support an asterisk in the path to test that all elements of an array do NOT have a specified length', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .not()
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', 3)
      .expectJSONLength('test_subjects.*', 5)
      .toss();
  });

  it('expectJSONLength should properly count arrays, strings, and objects using <=', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects', '<=3')
      .expectJSONLength('test_subjects.0', '<=4')
      .expectJSONLength('some_string', '<=9')
      .toss();
  });

  it('expectJSONLength should support an asterisk in the path to test all elements of an array using <=', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', '<=4')
      .toss();
  });

  it('expectJSONLength should properly count arrays, strings, and objects using <', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects', '<4')
      .expectJSONLength('test_subjects.0', '<5')
      .expectJSONLength('some_string', '<10')
      .toss();
  });

  it('expectJSONLength should support an asterisk in the path to test all elements of an array using <', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', '<5')
      .toss();
  });

  it('expectJSONLength should properly count arrays, strings, and objects using >=', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects', '>=3')
      .expectJSONLength('test_subjects.0', '>=4')
      .expectJSONLength('some_string', '>=9')
      .toss();
  });

  it('expectJSONLength should support an asterisk in the path to test all elements of an array using >=', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', '>=4')
      .toss();
  });

  it('expectJSONLength should properly count arrays, strings, and objects using >', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects', '>2')
      .expectJSONLength('test_subjects.0', '>3')
      .expectJSONLength('some_string', '>8')
      .toss();
  });

  it('expectJSONLength should support an asterisk in the path to test all elements of an array using >', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', '>3')
      .toss();
  });

  it('expectJSONLength should properly count arrays, strings, and objects testing string number', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects', '3')
      .expectJSONLength('test_subjects.0', '4')
      .expectJSONLength('some_string', '9')
      .toss();
  });

  it('expectJSONLength should support an asterisk in the path to test all elements of an array testing string number', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', '4')
      .toss();
  });

  it('expectStatus for mock request should return 404', function() {
    // Mock API
    var mockFn = mockRequest.mock()
    .get('/not-found')
      .respond({
        statusCode: 404
      })
    .run();

    var f1 = frisby.create(this.test.title)
      .get('http://mock-request/not-found', {mock: mockFn})
      .expectStatus(404)
      .toss();
  });


  it('Frisby basicAuth should set the correct HTTP Authorization header', function() {

    // Mock API
    var mockFn = mockRequest.mock()
    .get('/basic-auth')
      .respond({
        statusCode: 200,
        headers: {
          Authorization: 'Basic ZnJpc2J5OnBhc3N3ZA=='
        }
      })
    .run();

    frisby.create(this.test.title)
      .get('http://mock-request/basic-auth', {mock: mockFn})
      .auth('frisby', 'passwd')
      .expectStatus(200)
      .expectHeader('Authorization', 'Basic ZnJpc2J5OnBhc3N3ZA==')
      .after(function(err, res, body) {
        // Check to ensure outgoing set for basic auth
        expect(this.current.outgoing.auth).to.deep.equal({ user: 'frisby', pass: 'passwd', sendImmediately: true });

        // Check to ensure response headers contain basic auth header
        expect(this.current.response.headers.authorization).to.equal('Basic ZnJpc2J5OnBhc3N3ZA==');

      })
    .toss();

  });

  // reference: https://github.com/vlucas/frisby/issues/213 (does not appear to be an issue in IcedFrisby)
  it('should work with a HTTP 204 responses', function() {
      // Mock API
      var mockFn = mockRequest.mock()
          .get('/no-content')
          .respond({
              statusCode: 204
          })
          .run();

      frisby.create(this.test.title)
          .get('http://mock-request/no-content', {mock: mockFn})
          .expectStatus(204)
          .toss();

  });

  it('Invalid URLs should fail with an error message', function() {

    frisby.create(this.test.title)
      .get('invalid-url')
      .expectStatus(599)
      .timeout(5)
      .exceptionHandler(function(e) {
        expect(e.message).to.contain('Destination URL may be down or URL is invalid');
      })
    .toss();

  });

  it('should handle file uploads', function() {
    nock('http://httpbin.org', { allowUnmocked: true })
      .post('/file-upload')
      .once()
      .reply(200, {'result': 'ok'});

    // Intercepted with 'nock'
    frisby.create(this.test.title)
      .post('http://httpbin.org/file-upload', {
          name: 'Test Upload',
          file: fs.createReadStream(path.join(__dirname, 'logo-frisby.png'))
        }, { form: true })
      .expectStatus(200)
    .toss();
  });

  it('should allow for passing raw request body', function() {
    // Intercepted with 'nock'
    frisby.create(this.test.title)
      .post('http://httpbin.org/raw', {}, {
        body: 'some body here'
      })
      .expectStatus(200)
      .expectBodyContains('some body here')
    .toss();
  });

  it('should allow for passing raw request body and preserve json:true option', function() {
    nock('http://httpbin.org', { allowUnmocked: true })
      .post('/json')
      .once()
      .reply(200, {'foo': 'bar'});

    // Intercepted with 'nock'
    frisby.create(this.test.title)
      .post('http://httpbin.org/json', {}, { json: true })
      .expectStatus(200)
      .expectJSON({'foo': 'bar'})
      .expectHeader('Content-Type', 'application/json')
      .after(function(err, res, body) {
        expect(this.current.outgoing.headers['content-type']).to.equal('application/json');
        expect(this.current.outgoing.body).to.deep.equal({});
      })
    .toss();
  });

  it('preserves a custom json header with json:true option', function() {
    nock('http://example.com')
      .post('/json')
      .reply(200, {'foo': 'bar'});

    const customContentType = 'application/json; profile=http://example.com/schema/books#';

    // Intercepted with 'nock'
    frisby.create(this.test.title)
      .post('http://example.com/json', {}, { json: true })
      .addHeader('Content-Type', customContentType)
      .expectStatus(200)
      .expectJSON({'foo': 'bar'})
      .expectHeader('Content-Type', 'application/json')
      .after(function(err, res, body) {
        expect(this.current.outgoing.headers['content-type']).to.equal(customContentType);
        expect(this.current.outgoing.body).to.deep.equal({});
      })
    .toss();
  });

  describe('expectBodyContains', function () {
    it('should fail when the response is empty', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201);

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectBodyContains('this-will-not-match')
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(AssertionError);
          expect(err.message).to.equal("expected '' to include 'this-will-not-match'");
        })
        .toss();
    });

    it('TODO should fail when the response is absent');
    // Not sure how to reach the else block in `expectBodyContains`.
  });

  describe('expectHeaderToMatch', function () {
    it('should pass when regex matches', function() {
      nock('http://httpbin.org', { allowUnmocked: true })
        .post('/path')
        .once()
        .reply(201, "The payload", {'Location': '/path/23'});

      frisby.create(this.test.title)
        .post('http://httpbin.org/path', {foo: 'bar'})
        .expectStatus(201)
        .expectHeaderToMatch('location', /^\/path\/\d+$/)
        .toss();
    });

    it('should fail when the regex does not match', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201, 'The payload', {'Location': '/something-else/23'});

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeaderToMatch('location', /^\/path\/\d+$/)
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(AssertionError);
          expect(err.message).to.equal("expected '/something-else/23' to match /^\\/path\\/\\d+$/");
        })
        .toss();
    });

    it('should fail when the header is absent', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201);

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeaderToMatch('location', /^\/path\/\d+$/)
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error);
          expect(err.message).to.equal("Header 'location' does not match pattern '/^\\/path\\/\\d+$/' in HTTP response");
        })
        .toss();
    });
  });

  it('afterJSON should be invoked with the body json', function () {
    nock('http://example.com')
      .get('/json')
      .reply(200, {foo: 'bar'});

    frisby.create(this.test.title)
      .get('http://example.com/json')
      .expectStatus(200)
      .expectJSON({foo: 'bar'})
      .afterJSON(json => {
        expect(json).to.eql({ foo: 'bar' });
      })
      .toss();
  });

  it('globalSetup should be able to set baseURI', function () {
    nock('http://httpbin.org', { allowUnmocked: true })
     .post('/test')
     .once()
     .reply(200, function(uri, requestBody) {
       return requestBody;
     });

    frisby.globalSetup({
      request: {
        baseUri: 'http://httpbin.org'
      }
    });

    frisby.create(this.test.title)
      .post('/test', {}, {
        body: 'some body here'
      })
      .expectStatus(200)
      .expectBodyContains('some body here')
      .after(function() {
        expect(this.current.outgoing.uri).to.equal('http://httpbin.org/test');
      })
    .toss();

    restoreGlobalSetup();
  });

  it('baseUri should be able to override global setup', function() {
    nock('http://httpbin.org', { allowUnmocked: true })
     .post('/test')
     .once()
     .reply(200, (uri, requestBody) => requestBody);

    frisby.globalSetup({
      request: {
        baseUri: 'http://example.com'
      }
    });

    frisby.create(this.test.title)
      .baseUri('http://httpbin.org')
      .post('/test', {}, {
        body: 'some body here'
      })
      .expectStatus(200)
      .expectBodyContains('some body here')
      .after(function() {
        expect(this.current.outgoing.uri).to.equal('http://httpbin.org/test');
      })
    .toss();

    restoreGlobalSetup();
  });

  describe('Other HTTP methods', function () {
    it('delete', function () {
      nock('http://example.com')
       .delete('/test')
       .query({ name: 'sally' })
       .reply(204, (uri, requestBody) => requestBody);

      frisby.create(this.test.title)
        .delete('http://example.com/test', {}, {
          qs: { name: 'sally' },
          body: 'some body here'
        })
        .expectStatus(204)
        .expectBodyContains('some body here')
        .toss();
    });

    it('head', function () {
      nock('http://example.com')
       .head('/test')
       .query({ name: 'sally' })
       .reply(204, (uri, requestBody) => requestBody);

      frisby.create(this.test.title)
        .head('http://example.com/test', {
          qs: { name: 'sally' }
        })
        .expectStatus(204)
        .toss();
    });

    it('options', function () {
      nock('http://example.com')
       .options('/test')
       .query({ name: 'sally' })
       .reply(204, (uri, requestBody) => requestBody);

      frisby.create(this.test.title)
        .options('http://example.com/test', {
          qs: { name: 'sally' }
        })
        .expectStatus(204)
        .toss();
    });
  });
});
