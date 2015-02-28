var nock = require('nock');
var frisby = require('../lib/frisby');
var mockRequest = require('mock-request');
var Joi = require('joi');

// Built-in node.js
var fs = require('fs');
var path = require('path');

// Test global setup
var defaultGlobalSetup = frisby.globalSetup();
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
}
var restoreGlobalSetup = function() {
  frisby.globalSetup(defaultGlobalSetup);
}

// JSON to use in mock tests
var fixtures = {
  arrayOfObjects: {
      test_subjects: [{
        test_str: "I am a string one!",
        test_str_same: "I am the same...",
        test_int: 42,
        test_optional: null
      }, {
        test_str: "I am a string two!",
        test_str_same: "I am the same...",
        test_int: 43,
        test_optional: null
      }, {
        test_str: "I am a string three!",
        test_str_same: "I am the same...",
        test_int: 44,
        test_optional: 'Some String'
      }],
      other_data: false,
      some_string: 'somewhere'
    }
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

    var f1 = frisby.create(this.description)
      .get('http://mock-request/not-found', {mock: mockFn})
      .expectStatus(404)
      .toss();
  });

  it('globalSetup should set timeout to 3000', function() {
    mockGlobalSetup();
    var f1 = frisby.create(this.description)
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
    var f1 = frisby.create(this.description)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .after(function(err, res, body) {
        expect(this.current.outgoing.headers['test']).to.equal('One');
        expect(this.current.outgoing.headers['referer']).to.equal('http://frisbyjs.com');

        restoreGlobalSetup();
      })
      .toss();
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
    var f1 = frisby.create(this.description)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .addHeaders({ 'Test': 'Two' })
      .after(function(err, res, body) {
        // Local addHeaders should override global
        expect(this.current.outgoing.headers['test']).to.equal('Two');

        restoreGlobalSetup();
      })
      .toss();
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

    var f1 = frisby.create(this.description + ' - mock test one')
      .get('http://mock-request/test-object-array-ex', {mock: mockFn})
      .addHeaders({ 'Test': 'Two' })
      .after(function(err, res, body) {
        // Local addHeaders should override global
        expect(this.current.outgoing.headers['test']).to.equal('Two');
      })
    .toss();

    var f2 = frisby.create(this.description + ' - mock test two')
      .get('http://mock-request/test-object-array-ex2', {mock: mockFn2})
      .addHeaders({ 'Test': 'Three' })
      .after(function(err, res, body) {
        // Local addHeaders should override global
        expect(this.current.outgoing.headers['test']).to.equal('Three');
      })
    .toss();

    restoreGlobalSetup();
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

    var f1 = frisby.create(this.description)
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

    var f1 = frisby.create(this.description)
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

    var f1 = frisby.create(this.description)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .not().expectJSON('test_subjects.?', { // ? == ONE object in 'test_subjects' array
        test_str: "I am a string two nonsense!",
        test_int: 4433
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

    var f1 = frisby.create(this.description)
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

    var f1 = frisby.create(this.description)
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

    var f1 = frisby.create(this.description)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', 4)
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

    var f1 = frisby.create(this.description)
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

    var f1 = frisby.create(this.description)
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

    var f1 = frisby.create(this.description)
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

    var f1 = frisby.create(this.description)
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

    var f1 = frisby.create(this.description)
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

    var f1 = frisby.create(this.description)
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

    var f1 = frisby.create(this.description)
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

    var f1 = frisby.create(this.description)
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

    var f1 = frisby.create(this.description)
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

    var f1 = frisby.create(this.description)
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

    var f1 = frisby.create(this.description)
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

    frisby.create(this.description)
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


  it('Invalid URLs should fail with an error message', function() {

    frisby.create(this.description)
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
    frisby.create(this.description)
      .post('http://httpbin.org/file-upload', {
          name: 'Test Upload',
          file: fs.createReadStream(path.join(__dirname, 'logo-frisby.png'))
        }, { form: true })
      .expectStatus(200)
    .toss();
  });

  it('should allow for passing raw request body', function() {
    // Intercepted with 'nock'
    frisby.create(this.description)
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
    frisby.create(this.description)
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

  it('headers should be regex matchable', function() {
    nock('http://httpbin.org', { allowUnmocked: true })
      .post('/path')
      .once()
      .reply(201, "The payload", {'Location': '/path/23'});

    frisby.create(this.description)
      .post('http://httpbin.org/path', {foo: 'bar'})
      .expectStatus(201)
      .expectHeaderToMatch('location', /^\/path\/\d+$/)
      .toss();
  });

  it('globalSetup should be able to set baseURI', function() {
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

    frisby.create(this.description)
      .post('/test', {}, {
        body: 'some body here'
      })
      .expectStatus(200)
      .expectBodyContains('some body here')
      .after(function() {
        expect(this.current.outgoing.uri).to.equal('http://httpbin.org/test');
      })
    .toss();
  });
});
