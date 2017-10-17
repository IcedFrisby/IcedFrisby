'use strict'

var nock = require('nock')
var fixtures = require('./fixtures/repetition_fixture.json')
var frisby = require('../lib/icedfrisby')
var mockRequest = require('mock-request')
var Joi = require('joi')
const { AssertionError } = require('chai')
const { MultiError } = require('verror')
const sinon = require('sinon')

// Built-in node.js
var fs = require('fs')
var path = require('path')
const util = require('util')

// enable real connections for localhost otherwise useApp() tests won't work
nock.enableNetConnect('127.0.0.1')

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
  })
}

var restoreGlobalSetup = function() {
  frisby.globalSetup({
    request: {
      headers: {},
      inspectOnFailure: false,
      json: false,
      baseUri: ''
    }
  })
}

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
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/not-found', {mock: mockFn})
      .expectStatus(404)
      .toss()
  })

  it('globalSetup should set timeout to 3000', function() {
    mockGlobalSetup()
    var f1 = frisby.create(this.test.title)
    expect(f1.timeout()).to.equal(3000)
    restoreGlobalSetup()
  })

  it('globalSetup should set local request headers', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    mockGlobalSetup()
    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .after(function(err, res, body) {
        expect(this.current.outgoing.headers['test']).to.equal('One')
        expect(this.current.outgoing.headers['referer']).to.equal('http://frisbyjs.com')
      })
      .toss()
    restoreGlobalSetup()
  })

  it('addHeaders should override globalSetup request headers', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    mockGlobalSetup()
    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .addHeaders({ 'Test': 'Two' })
      .after(function(err, res, body) {
        // Local addHeaders should override global
        expect(this.current.outgoing.headers['test']).to.equal('Two')
      })
      .toss()
    restoreGlobalSetup()
  })

  it('addHeaders should override globalSetup request headers and not taint other Frisby tests', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array-ex')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    var mockFn2 = mockRequest.mock()
      .get('/test-object-array-ex2')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    mockGlobalSetup()

    frisby.create(this.test.title + ' - mock test one')
      .get('http://mock-request/test-object-array-ex', {mock: mockFn})
      .addHeaders({ 'Test': 'Two' })
      .after(function(err, res, body) {
        // Local addHeaders should override global
        expect(this.current.outgoing.headers['test']).to.equal('Two')
      })
      .toss()

    frisby.create(this.test.title + ' - mock test two')
      .get('http://mock-request/test-object-array-ex2', {mock: mockFn2})
      .addHeaders({ 'Test': 'Three' })
      .after(function(err, res, body) {
        // Local addHeaders should override global
        expect(this.current.outgoing.headers['test']).to.equal('Three')
      })
      .toss()

    restoreGlobalSetup()
  })

  describe('before callbacks', function () {
    it('should be invoked in sequence before the request', function() {
      const sequence = []

      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
          statusCode: 200,
          body: fixtures.singleObject
        })
        .run()
      const requestFn = function () {
        sequence.push('request')
        return mockFn.apply(this, arguments)
      }

      frisby.create(this.test.title)
        .before(() => { sequence.push('before-one') })
        .before(() => { sequence.push('before-two') })
        .get('http://mock-request/test-object', {mock: requestFn})
        .after(() => {
          const expectedSequence = ['before-one', 'before-two', 'request']
          expect(sequence).to.deep.equal(expectedSequence)
        })
        .toss()
    })

    it('should respect the exception handler', function() {
      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
          statusCode: 200,
          body: fixtures.singleObject
        })
        .run()

      const message = 'this is the error'

      frisby.create(this.test.title)
        .before(() => { throw new Error(message) })
        .get('http://mock-request/test-object', {mock: mockFn})
        .exceptionHandler(err => {
          expect(err.message).to.equal(message)
        })
        .toss()
    })
  })

  describe('before callbacks (async)', function () {
    it('should be invoked in sequence before the request', function() {
      const sequence = []

      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
          statusCode: 200,
          body: fixtures.singleObject
        })
        .run()
      const requestFn = function () {
        sequence.push('request')
        return mockFn.apply(this, arguments)
      }

      frisby.create(this.test.title)
        .before((done) => {
          setTimeout(function() {
            sequence.push('before-one')
            done()
          }, 10)
        })
        .before(() => { sequence.push('before-two') })
        .before((done) => {
          setTimeout(function() {
            sequence.push('before-three')
            done()
          }, 10)
        })
        .get('http://mock-request/test-object', {mock: requestFn})
        .after(() => {
          const expectedSequence = ['before-one', 'before-two', 'before-three', 'request']
          expect(sequence).to.deep.equal(expectedSequence)
        })
        .toss()
    })

    it('should respect the exception handler', function() {
      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
          statusCode: 200,
          body: fixtures.singleObject
        })
        .run()

      const message = 'this is the error'

      frisby.create(this.test.title)
        .before((done) => { throw new Error(message) })
        .get('http://mock-request/test-object', {mock: mockFn})
        .exceptionHandler(err => {
          expect(err.message).to.equal(message)
        })
        .toss()
    })
  })

  it('expectJSON should test EQUALITY for a SINGLE object', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object')
      .respond({
        statusCode: 200,
        body: fixtures.singleObject
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object', {mock: mockFn})
      .expectJSON({
        test_str: "Hey Hai Hello",
        test_str_same: "I am the same...",
        test_int: 1,
        test_optional: null
      })
      .toss()
  })

  it('expectJSON should test INEQUALITY for a SINGLE object', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object')
      .respond({
        statusCode: 200,
        body: fixtures.singleObject
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object', {mock: mockFn})
      .not().expectJSON({
        test_str: "Bye bye bye!",
        test_str_same: "I am not the same...",
        test_int: 9,
        test_optional: true
      })
      .toss()
  })

  it('expectJSON should test EQUALITY for EACH object in an array with an asterisk path', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-array')
      .respond({
        statusCode: 200,
        body: fixtures.sameNumbers
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-array', {mock: mockFn})
      .expectJSON('*', { num: 5 })
      .toss()
  })

  it('expectJSON should test INEQUALITY for EACH object in an array with an asterisk path', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-array')
      .respond({
        statusCode: 200,
        body: fixtures.sameNumbers
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-array', {mock: mockFn})
      .not().expectJSON('*', { num: 123 })
      .toss()
  })

  it('expectJSON should test EACH object in an array with path ending with asterisk', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONTypes('test_subjects.*', { // * == EACH object in here should match
        test_str_same: Joi.string().valid("I am the same..."),
        test_int: Joi.number(),
        test_str: Joi.string(),
        test_optional: Joi.any().optional()
      })
      .toss()
  })

  it('expectJSON should match ONE object in an array with path ending with question mark', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONTypes('test_subjects.?', { // ? == ONE object in here should match (contains)
        test_str_same: Joi.string().valid("I am the same..."),
        test_int: Joi.number().valid(43),
        test_str: Joi.string().valid("I am a string two!"),
        test_optional: Joi.any().optional()
      })
      .toss()
  })

  it('expectJSON should NOT match ONE object in an array with path ending with question mark', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .not().expectJSON('test_subjects.?', { // ? == ONE object in 'test_subjects' array
        test_str: "I am a string two nonsense!",
        test_int: 4433
      })
      .toss()
  })

  it('expectContainsJSON should MATCH fields for a SINGLE object', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object')
      .respond({
        statusCode: 200,
        body: fixtures.singleObject
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object', {mock: mockFn})
      .expectContainsJSON({
        test_str: "Hey Hai Hello",
        // test_str_same: "I am the same...", // leave this out of the orig object, should still match
        test_int: 1,
        test_optional: null
      })
      .toss()
  })

  it('expectContainsJSON should NOT MATCH for a SINGLE object', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object')
      .respond({
        statusCode: 200,
        body: fixtures.singleObject
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object', {mock: mockFn})
      .not().expectContainsJSON({
        test_str: "Bye bye bye!",
        test_str_same: "I am not the same...",
        test_int: 9,
        test_optional: true
      })
      .toss()
  })

  it('expectContainsJSON should NOT MATCH for a SINGLE object with a single field', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object')
      .respond({
        statusCode: 200,
        body: fixtures.singleObject
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object', {mock: mockFn})
      .not().expectContainsJSON({
        test_str: "Bye bye bye!",
        // test_str_same: "I am not the same...",
        // test_int: 9,
        // test_optional: true
      })
      .toss()
  })

  it('expectContainsJSON should MATCH for EACH object in an array with an asterisk path', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-array')
      .respond({
        statusCode: 200,
        body: fixtures.sameNumbers
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-array', {mock: mockFn})
      .expectContainsJSON('*', { num: 5 })
      .toss()
  })

  it('expectContainsJSON should NOT MATCH for EACH object in an array with an asterisk path', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-array')
      .respond({
        statusCode: 200,
        body: fixtures.sameNumbers
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-array', {mock: mockFn})
      .not().expectContainsJSON('*', { num: 123 })
      .toss()
  })

  it('expectContainsJSON should MATCH for EACH object in an array with path ending with asterisk', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectContainsJSON('test_subjects.*', { // * == EACH object in here should match
        test_str_same: "I am the same...",
      })
      .toss()
  })

  it('expectContainsJSON should MATCH ONE object in an array with path ending with question mark', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectContainsJSON('test_subjects.?', { // ? == ONE object in here should match (contains)
        test_str: "I am a string two!",
      })
      .toss()
  })

  it('expectContainsJSON should NOT MATCH ONE object in an array with path ending with question mark', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .not().expectContainsJSON('test_subjects.?', { // ? == ONE object in 'test_subjects' array
        test_str: "I am a string two nonsense!",
      })
      .toss()
  })

  it('expectJSONTypes should NOT match ONE object in an array with path ending with question mark', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .not().expectJSONTypes('test_subjects.?', { // ? == ONE object in 'test_subjects' array
        test_str: Joi.boolean(),
        test_int: Joi.string()
      })
      .toss()
  })

  it('expectJSONLength should properly count arrays, strings, and objects', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects', 3)
      .expectJSONLength('test_subjects.0', 4)
      .expectJSONLength('some_string', 9)
      .toss()
  })

  it('expectJSONLength should support an asterisk in the path to test all elements of an array', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', 4)
      .toss()
  })

  it('expectJSONLength should support an asterisk in the path to test that all elements of an array do NOT have a specified length', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .not()
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', 3)
      .expectJSONLength('test_subjects.*', 5)
      .toss()
  })

  it('expectJSONLength should properly count arrays, strings, and objects using <=', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects', '<=3')
      .expectJSONLength('test_subjects.0', '<=4')
      .expectJSONLength('some_string', '<=9')
      .toss()
  })

  it('expectJSONLength should support an asterisk in the path to test all elements of an array using <=', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', '<=4')
      .toss()
  })

  it('expectJSONLength should properly count arrays, strings, and objects using <', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects', '<4')
      .expectJSONLength('test_subjects.0', '<5')
      .expectJSONLength('some_string', '<10')
      .toss()
  })

  it('expectJSONLength should support an asterisk in the path to test all elements of an array using <', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', '<5')
      .toss()
  })

  it('expectJSONLength should properly count arrays, strings, and objects using >=', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects', '>=3')
      .expectJSONLength('test_subjects.0', '>=4')
      .expectJSONLength('some_string', '>=9')
      .toss()
  })

  it('expectJSONLength should support an asterisk in the path to test all elements of an array using >=', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', '>=4')
      .toss()
  })

  it('expectJSONLength should properly count arrays, strings, and objects using >', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects', '>2')
      .expectJSONLength('test_subjects.0', '>3')
      .expectJSONLength('some_string', '>8')
      .toss()
  })

  it('expectJSONLength should support an asterisk in the path to test all elements of an array using >', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', '>3')
      .toss()
  })

  it('expectJSONLength should properly count arrays, strings, and objects testing string number', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects', '3')
      .expectJSONLength('test_subjects.0', '4')
      .expectJSONLength('some_string', '9')
      .toss()
  })

  it('expectJSONLength should support an asterisk in the path to test all elements of an array testing string number', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: mockFn})
      .expectJSONLength('test_subjects.*', '4')
      .toss()
  })

  it('expectStatus for mock request should return 404', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/not-found')
      .respond({
        statusCode: 404
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/not-found', {mock: mockFn})
      .expectStatus(404)
      .toss()
  })

  describe('after() callbacks', function() {
    it('should be invoked in sequence after a successful request', function () {
      const sequence = []
      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
          statusCode: 200,
          body: fixtures.singleObject
        })
        .run()
      const requestFn = function () {
        sequence.push('request')
        return mockFn.apply(this, arguments)
      }

      frisby.create(this.test.title)
        .get('http://mock-request/test-object', {mock: requestFn})
        .expectStatus(200)
        .after(() => { sequence.push('after-one') })
        .after(function() { this.after(() => { sequence.push('after-dynamic') }) })
        .after(() => { sequence.push('after-two') })
        .finally(() => {
          const expectedSequence = ['request', 'after-one', 'after-two', 'after-dynamic']
          expect(sequence).to.deep.equal(expectedSequence)
        })
        .toss()
    })

    describe('should not be invoked after an failed expectation', function() {
      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
          statusCode: 200,
          body: fixtures.singleObject
        })
        .run()

      const test = frisby.create('aaa')
        .get('http://mock-request/test-object', {mock: mockFn})
        .expectStatus(204)
        .after(() => { expect.fail("The after function shouldn't be invoked") })

      // Intercept the raised exception to prevent Mocha from receiving it.
      test._invokeExpects = function (done) {
        try {
          test.prototype._invokeExpects.call(test, done)
        } catch (e) {
          done()
          return
        }
        // If we catch the exeption, as expected, we should never get here.
        expect.fail('The failed expectation should have raised an exception')
      }

      test.toss()
    })

    it('TODO: should not be invoked after a test failure')
  })

  describe('after() callbacks (async)', function() {
    it('should be invoked in sequence after a successful request', function () {
      const sequence = []
      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
          statusCode: 200,
          body: fixtures.singleObject
        })
        .run()
      const requestFn = function () {
        sequence.push('request')
        return mockFn.apply(this, arguments)
      }

      frisby.create(this.test.title)
        .get('http://mock-request/test-object', {mock: requestFn})
        .expectStatus(200)
        .after(() => { sequence.push('after-one') })
        .after(function(error, res, body, headers, done) {
          setTimeout(() => {
            sequence.push('after-two')
            this.after(() => { sequence.push('after-dynamic') })
            done()
          }, 10)
        })
        .after(() => { sequence.push('after-three') })
        .finally(() => {
          const expectedSequence = ['request', 'after-one', 'after-two', 'after-three', 'after-dynamic']
          expect(sequence).to.deep.equal(expectedSequence)
        })
        .toss()
    })
  })

  describe('finally() hooks', function() {
    it('should be invoked in sequence after after() hooks', function () {
      const sequence = []
      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
          statusCode: 200,
          body: fixtures.singleObject
        })
        .run()
      const requestFn = function () {
        sequence.push('request')
        return mockFn.apply(this, arguments)
      }

      frisby.create(this.test.title)
        .get('http://mock-request/test-object', {mock: requestFn})
        .expectStatus(200)
        .after(() => { sequence.push('after-one') })
        .after(() => { sequence.push('after-two') })
        .after(function() { this.finally(() => { sequence.push('finally-dynamic') }) }) // should be invoked even later, so it won't register below
        .finally(() => { sequence.push('finally-one') })
        .finally(() => { sequence.push('finally-two') })
        .finally(() => {
          const expectedSequence = ['request', 'after-one', 'after-two', 'finally-one', 'finally-two']
          expect(sequence).to.deep.equal(expectedSequence)
        })
        .toss()
    })

    describe('should be invoked after an failed expectation', function() {
      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
          statusCode: 200,
          body: fixtures.singleObject
        })
        .run()

      let finallyInvoked = false

      const test = frisby.create('aaa')
        .get('http://mock-request/test-object', {mock: mockFn})
        .expectStatus(204)
        .finally(() => { finallyInvoked = true })

      // TODO: How can I ensure this has been called?
      test._finish = function (done) {
        test.constructor.prototype._finish.call(this, (err) => {
          expect(finallyInvoked).to.be.ok
          done()
        })
      }

      test.toss()
    })

    describe('before hook errors are bundled together', function () {
      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
          statusCode: 200,
          body: fixtures.singleObject
        })
        .run()

      const beforeErrorMessage = 'this-is-the-before-error'
      const finallyErrorMessage = 'this-is-the-finally-error'

      const test = frisby.create('error bundling')
        .get('http://mock-request/test-object', {mock: mockFn})
        .expectStatus(200)
        .before(() => { throw Error(beforeErrorMessage) })
        .finally(() => { throw Error(finallyErrorMessage) })

      // TODO: How can I ensure this has been called?
      test._finish = function (done) {
        test.constructor.prototype._finish.call(this, (err) => {
          expect(err).to.be.an.instanceOf(MultiError)
          expect(err.errors()).to.have.lengthOf(2)
          expect(err.errors()[0].message).to.equal(beforeErrorMessage)
          expect(err.errors()[1].message).to.equal(finallyErrorMessage)
          done()
        })
      }

      test.toss()
    })
  })

  describe('finally() hooks (async)', function() {
    it('should be invoked in sequence after after() hooks', function () {
      const sequence = []
      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
          statusCode: 200,
          body: fixtures.singleObject
        })
        .run()
      const requestFn = function () {
        sequence.push('request')
        return mockFn.apply(this, arguments)
      }

      frisby.create(this.test.title)
        .get('http://mock-request/test-object', {mock: requestFn})
        .expectStatus(200)
        .after(() => { sequence.push('after-one') })
        .finally((done) => {
          setTimeout(() => {
            sequence.push('finally-one')
            done()
          }, 10)
        })
        .finally(function() { this.finally(() => { sequence.push('finally-dynamic') }) }) // should be invoked even later, so it won't register below
        .finally(() => { sequence.push('finally-two') })
        .finally((done) => {
          setTimeout(() => {
            sequence.push('finally-three')
            done()
          }, 10)
        })
        .finally(() => {
          const expectedSequence = ['request', 'after-one', 'finally-one', 'finally-two', 'finally-three']
          expect(sequence).to.deep.equal(expectedSequence)
        })
        .toss()
    })
  })

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
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/basic-auth', {mock: mockFn})
      .auth('frisby', 'passwd')
      .expectStatus(200)
      .expectHeader('Authorization', 'Basic ZnJpc2J5OnBhc3N3ZA==')
      .after(function(err, res, body) {
        // Check to ensure outgoing set for basic auth
        expect(this.current.outgoing.auth).to.deep.equal({ user: 'frisby', pass: 'passwd', sendImmediately: true })

        // Check to ensure response headers contain basic auth header
        expect(this.current.response.headers.authorization).to.equal('Basic ZnJpc2J5OnBhc3N3ZA==')
      })
      .toss()
  })

  // reference: https://github.com/vlucas/frisby/issues/213 (does not appear to be an issue in IcedFrisby)
  it('should work with a HTTP 204 responses', function() {
    // Mock API
    var mockFn = mockRequest.mock()
      .get('/no-content')
      .respond({
        statusCode: 204
      })
      .run()

    frisby.create(this.test.title)
      .get('http://mock-request/no-content', {mock: mockFn})
      .expectStatus(204)
      .toss()

  })

  it('Invalid URLs should fail with an error message', function() {

    frisby.create(this.test.title)
      .get('invalid-url')
      .expectStatus(599)
      .timeout(5)
      .exceptionHandler(function(e) {
        expect(e.message).to.contain('Destination URL may be down or URL is invalid')
      })
      .toss()

  })

  describe('timeouts and retries', function () {
    it('should fail when timeout() value elapses', function () {
      let startTime

      nock('http://example.com')
        .get('/just-dont-come-back-1')
        .reply((uri, requestBody, callback) => {
          startTime = process.hrtime()
          // To simulate a timeout, do not invoke the callback.
        })

      const requestTimeoutMillis = 123

      frisby.create(this.test.title)
        .get('http://example.com/just-dont-come-back-1')
        .timeout(requestTimeoutMillis)
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?

          // Confidence check
          expect(startTime).to.be.an('array')

          // Assertion
          const [seconds, nanoseconds] = process.hrtime(startTime)
          const endTimeMillis = 1e3 * seconds + 1e-6 * nanoseconds

          const assertionGracePeriodMillis = [5, 50]
          expect(endTimeMillis).to.be.within(
            requestTimeoutMillis - assertionGracePeriodMillis[0],
            requestTimeoutMillis + assertionGracePeriodMillis[1])
        })
        .toss()
    })

    it('should retry the expected number of times after a timeout', function () {
      let actualRequestCount = 0

      nock('http://example.com')
        .get('/just-dont-come-back-2')
        .times(5)
        .reply((uri, requestBody, callback) => {
          actualRequestCount += 1
          // To simulate a timeout, do not invoke the callback.
        })

      const retryCount = 4

      frisby.create(this.test.title)
        .get('http://example.com/just-dont-come-back-2')
        .timeout(5)
        .retry(retryCount, 0)
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(actualRequestCount).to.equal(retryCount + 1)
        })
        .toss()
    })

    it('should delay retries by the backoff amount', function () {
      let actualRequestCount = 0
      let firstRequestTime
      let secondRequestTime

      nock('http://example.com')
        .get('/fail-once')
        .twice()
        .reply((uri, requestBody) => {
          actualRequestCount += 1
          switch (actualRequestCount) {
            case 1:
              firstRequestTime = process.hrtime()
              return [500, 'Fake server error']
            case 2:
              secondRequestTime = process.hrtime(firstRequestTime)
              return [200]
            default:
              throw Error('Expected only two requests')
          }
        })

      const expectedBackoffMillis = 123

      frisby.create(this.test.title)
        .get('http://example.com/fail-once')
        .retry(1, expectedBackoffMillis)
        .after(() => {
          const [seconds, nanoseconds] = secondRequestTime
          const timeBetweenRequestsMillis = 1e3 * seconds + 1e-6 * nanoseconds

          const assertionGracePeriodMillis = 25
          expect(timeBetweenRequestsMillis).to.be.within(
            expectedBackoffMillis,
            expectedBackoffMillis + assertionGracePeriodMillis)
        })
        .toss()
    })

    it('should pass the expected timeout to mocha, and not cause mocha to time out', function () {
      let requestCount = 0

      nock('http://example.com')
        .get('/fail-four-times')
        .delay(50)
        .twice()
        .reply((uri, requestBody) => {
          requestCount += 1
          switch (requestCount) {
            case 1: return [500, 'Fake server error']
            case 2: return [200]
            default: throw Error('Expected only two requests')
          }
        })

      const test = frisby.create(this.test.title)
        .get('http://example.com/fail-four-times')
        .timeout(75)
        .retry(1, 50)
        .expectStatus(200)

      const gracePeriodMillis = 25
      expect(test._mochaTimeout()).to.equal(75 + 50 + 75 + gracePeriodMillis)

      test.toss()
    })
  })

  it('should handle file uploads', function() {
    nock('http://httpbin.org', { allowUnmocked: true })
      .post('/file-upload')
      .once()
      .reply(200, {'result': 'ok'})

    // Intercepted with 'nock'
    frisby.create(this.test.title)
      .post('http://httpbin.org/file-upload', {
        name: 'Test Upload',
        file: fs.createReadStream(path.join(__dirname, 'logo-frisby.png'))
      }, { form: true })
      .expectStatus(200)
      .toss()
  })

  it('should allow for passing raw request body', function() {
    nock('http://example.com')
      .post('/raw')
      .reply(200, function(uri, requestBody) {
        return requestBody
      })

    frisby.create(this.test.title)
      .post('http://example.com/raw', {}, {
        body: 'some body here'
      })
      .expectStatus(200)
      .expectBodyContains('some body here')
      .toss()
  })

  it('should allow for passing raw request body and preserve json:true option', function() {
    nock('http://httpbin.org', { allowUnmocked: true })
      .post('/json')
      .once()
      .reply(200, {'foo': 'bar'})

    // Intercepted with 'nock'
    frisby.create(this.test.title)
      .post('http://httpbin.org/json', {}, { json: true })
      .expectStatus(200)
      .expectJSON({'foo': 'bar'})
      .expectHeader('Content-Type', 'application/json')
      .after(function(err, res, body) {
        expect(this.current.outgoing.headers['content-type']).to.equal('application/json')
        expect(this.current.outgoing.body).to.deep.equal({})
      })
      .toss()
  })

  it('preserves a custom json header with json:true option', function() {
    nock('http://example.com')
      .post('/json')
      .reply(200, {'foo': 'bar'})

    const customContentType = 'application/json; profile=http://example.com/schema/books#'

    // Intercepted with 'nock'
    frisby.create(this.test.title)
      .post('http://example.com/json', {}, { json: true })
      .addHeader('Content-Type', customContentType)
      .expectStatus(200)
      .expectJSON({'foo': 'bar'})
      .expectHeader('Content-Type', 'application/json')
      .after(function(err, res, body) {
        expect(this.current.outgoing.headers['content-type']).to.equal(customContentType)
        expect(this.current.outgoing.body).to.deep.equal({})
      })
      .toss()
  })

  describe('expectBodyContains', function () {
    it('should fail when the response is empty', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201)

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectBodyContains('this-will-not-match')
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(AssertionError)
          expect(err.message).to.equal("expected '' to include 'this-will-not-match'")
        })
        .toss()
    })

    it('TODO should fail when the response is absent')
    // Not sure how to reach the else block in `expectBodyContains`.
  })

  describe('expectHeaderToMatch', function () {
    it('should pass when regex matches', function() {
      nock('http://httpbin.org', { allowUnmocked: true })
        .post('/path')
        .once()
        .reply(201, "The payload", {'Location': '/path/23'})

      frisby.create(this.test.title)
        .post('http://httpbin.org/path', {foo: 'bar'})
        .expectStatus(201)
        .expectHeaderToMatch('location', /^\/path\/\d+$/)
        .toss()
    })

    it('should fail when the regex does not match', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201, 'The payload', {'Location': '/something-else/23'})

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeaderToMatch('location', /^\/path\/\d+$/)
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(AssertionError)
          expect(err.message).to.equal("expected '/something-else/23' to match /^\\/path\\/\\d+$/")
        })
        .toss()
    })

    it('should fail when the header is absent', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201)

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeaderToMatch('location', /^\/path\/\d+$/)
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal("Header 'location' does not match pattern '/^\\/path\\/\\d+$/' in HTTP response")
        })
        .toss()
    })
  })

  describe('expectNoHeader', function () {
    it('should pass when a header is absent', function() {
      nock('http://httpbin.org', { allowUnmocked: true })
        .post('/path')
        .once()
        .reply(201, "The payload")

      frisby.create(this.test.title)
        .post('http://httpbin.org/path', {foo: 'bar'})
        .expectStatus(201)
        .expectNoHeader('Location')
        .expectNoHeader('location')
        .toss()
    })

    it('should fail when a header is present', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201, 'The payload', {'Location': '/something-else/23'})

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectNoHeader('Location')
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(AssertionError)
          expect(err.message).to.equal("expected { location: '/something-else/23' } to not have property 'location'")
        })
        .toss()
    })
  })

  it('afterJSON should be invoked with the body json', function () {
    nock('http://example.com')
      .get('/json')
      .reply(200, {foo: 'bar'})

    frisby.create(this.test.title)
      .get('http://example.com/json')
      .expectStatus(200)
      .expectJSON({foo: 'bar'})
      .afterJSON(json => {
        expect(json).to.eql({ foo: 'bar' })
      })
      .toss()
  })

  it('globalSetup should be able to set baseURI', function () {
    nock('http://httpbin.org', { allowUnmocked: true })
      .post('/test')
      .once()
      .reply(200, function(uri, requestBody) {
        return requestBody
      })

    frisby.globalSetup({
      request: {
        baseUri: 'http://httpbin.org'
      }
    })

    frisby.create(this.test.title)
      .post('/test', {}, {
        body: 'some body here'
      })
      .expectStatus(200)
      .expectBodyContains('some body here')
      .after(function() {
        expect(this.current.outgoing.uri).to.equal('http://httpbin.org/test')
      })
      .toss()

    restoreGlobalSetup()
  })

  it('baseUri should be able to override global setup', function() {
    nock('http://httpbin.org', { allowUnmocked: true })
      .post('/test')
      .once()
      .reply(200, (uri, requestBody) => requestBody)

    frisby.globalSetup({
      request: {
        baseUri: 'http://example.com'
      }
    })

    frisby.create(this.test.title)
      .baseUri('http://httpbin.org')
      .post('/test', {}, {
        body: 'some body here'
      })
      .expectStatus(200)
      .expectBodyContains('some body here')
      .after(function() {
        expect(this.current.outgoing.uri).to.equal('http://httpbin.org/test')
      })
      .toss()

    restoreGlobalSetup()
  })

  describe('Other HTTP methods', function () {
    it('delete', function () {
      nock('http://example.com')
        .delete('/test')
        .query({ name: 'sally' })
        .reply(204, (uri, requestBody) => requestBody)

      frisby.create(this.test.title)
        .delete('http://example.com/test', {}, {
          qs: { name: 'sally' },
          body: 'some body here'
        })
        .expectStatus(204)
        .expectBodyContains('some body here')
        .toss()
    })

    it('head', function () {
      nock('http://example.com')
        .head('/test')
        .query({ name: 'sally' })
        .reply(204, (uri, requestBody) => requestBody)

      frisby.create(this.test.title)
        .head('http://example.com/test', {
          qs: { name: 'sally' }
        })
        .expectStatus(204)
        .toss()
    })

    it('options', function () {
      nock('http://example.com')
        .options('/test')
        .query({ name: 'sally' })
        .reply(204, (uri, requestBody) => requestBody)

      frisby.create(this.test.title)
        .options('http://example.com/test', {
          qs: { name: 'sally' }
        })
        .expectStatus(204)
        .toss()
    })
  })

  it('util.inspect should not have side effects', function () {
    // Invoking console.log() on a frisby object invokes util.inspect, which
    // in turn invokes inspect() on the frisby object. This causes side
    // effects which trigger a ("cb.call is not a function") error, which is
    // difficult to debug.
    const test = frisby.create(this.test.title)
    expect(test.current.inspections).to.have.lengthOf(0)
    test.inspectJSON(() => {})
    expect(test.current.inspections).to.have.lengthOf(1)
    util.inspect(test)
    expect(test.current.inspections).to.have.lengthOf(1)
  })

  describe('exclusive tests', function () {
    let sandbox, globalMock, describeMock
    beforeEach(function () {
      sandbox = sinon.sandbox.create()
      globalMock = sandbox.mock(global, 'describe')
      globalMock.expects('describe').never()
      describeMock = sandbox.mock(global.describe)
      describeMock.expects('only').once()
    })
    afterEach(function () {
      globalMock.verify()
      describeMock.verify()
    })
    afterEach(function () { sandbox.restore() })

    it('should register exclusive tests', function () {
      frisby.create(this.test.title)
        .get('http://example.com/test')
        .only()
        .toss()
    })
  })

})
