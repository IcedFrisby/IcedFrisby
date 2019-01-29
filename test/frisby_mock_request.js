'use strict'

const nock = require('nock')
const fixtures = require('./fixtures/repetition_fixture.json')
const frisby = require('../lib/icedfrisby')
const mockRequest = require('mock-request')
const Joi = require('joi')
const { AssertionError } = require('chai')
const { MultiError } = require('verror')
const sinon = require('sinon')
const proxyquire = require('proxyquire').noPreserveCache()

// Built-in node.js
const fs = require('fs')
const path = require('path')
const util = require('util')

// Enable real connections for localhost otherwise useApp() tests won't work.
// httpbin tests runa gainst the live server, so we explicitly allow it
// through. Since all nocks run before the first frisby is tossed, we need to
// do this first.
nock.enableNetConnect(/127.0.0.1|httpbin.org/)

//
// Tests run like normal Frisby specs but with 'mock' specified with a 'mock-request' object
// These work without further 'expects' statements because Frisby generates and runs Jasmine tests
//
describe('Frisby matchers', function() {

  it('expectStatus for mock request should return 404', function() {
    // Mock API
    const mockFn = mockRequest.mock()
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

    it('should error gracefully when passed no function', function(){
      const spy = sinon.spy()

      try {
        frisby.create(this.test.title)
          .before()
          .get('http://mock-request/test-object')
          .toss()
      } catch(err){
        spy()
        expect(err.message).to.equal('Expected Function object in before(), but got undefined')
      }

      expect(spy.calledOnce).to.equal(true)
    })

    it('should error gracefully when passed a string instead of function', function(){
      const spy = sinon.spy()

      try {
        frisby.create(this.test.title)
          .before('something')
          .get('http://mock-request/test-object')
          .toss()
      } catch(err){
        spy()
        expect(err.message).to.equal('Expected Function object in before(), but got string')
      }

      expect(spy.calledOnce).to.equal(true)
    })

    it('should wait the configured period before proceeding to the request', function(){
      let timeDelta = 0

      const mockFn = mockRequest.mock()
        .get('/not-found')
        .respond({
          statusCode: 404
        })
        .run()

      frisby.create(this.test.title)
        .before(() => {
          timeDelta = (new Date).getTime()
        })
        .waits(1000)
        .get('http://mock-request/not-found', {mock: mockFn})
        .after(() => {
          timeDelta = (new Date).getTime() - timeDelta
          expect(timeDelta).to.be.above(999)
          expect(timeDelta).to.be.below(1100)
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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

  it('expectJSON should throw an error when response is not JSON', function(){

    const responseBody = 'Payload'

    nock('http://example.com')
      .post('/path')
      .reply(200, responseBody)

    frisby.create(this.test.title)
      .post('http://example.com/path')
      .expectJSON({foo: 'bar'})
      .exceptionHandler(err => {
        // TODO How can I assert that this method is called?
        expect(err).to.be.an.instanceof(Error)
        expect(err.message).to.equal("Error parsing JSON string: Unexpected token P in JSON at position 0\n\tGiven: Payload")
      })
      .toss()
  })

  it('expectJSONTypes should fail with a helpful message', function() {
    const frisbyWithoutJoi = proxyquire('../lib/icedfrisby', {
      './pathMatch': proxyquire('../lib/pathMatch', { joi: null })
    })

    const mockFn = mockRequest.mock()
      .get('/joi-test')
      .respond({
        statusCode: 200,
        body: fixtures.singleObject
      })
      .run()

    frisbyWithoutJoi.create(this.test.title)
      .get('http://mock-request/joi-test', {mock: mockFn})
      .expectStatus(200)
      .expectJSONTypes({ foo: 'bar' })
      .exceptionHandler(err => {
        // TODO How can I assert that this method is called?
        expect(err.message).to.equal('Joi is required to use expectJSONTypes, and must be installed separately')
      })
      .toss()
  })

  it('expectJSON should NOT match ONE object in an array with path ending with question mark', function() {
    // Mock API
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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
    const mockFn = mockRequest.mock()
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

    it('should not be invoked after an failed expectation', function() {
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

    it('should not be invoked after a previous after hook raised an exception', function(){
      const spy = sinon.spy()

      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
          statusCode: 200,
          body: fixtures.singleObject
        })
        .run()

      frisby.create(this.test.title)
        .get('http://mock-request/test-object', {mock: mockFn})
        .expectStatus(200)
        .exceptionHandler(() => {}) //Swallow the exception
        .after(() => {
          spy()
          throw Error('Error in first after()')
        })
        .after(() => {
          spy()
        })
        .finally(() => {
          expect(spy.calledOnce).to.equal(true)
        })
        .toss()
    })

    it('should error gracefully when passed no function', function(){
      const spy = sinon.spy()

      try {
        frisby.create(this.test.title)
          .get('http://mock-request/test-object')
          .after()
          .toss()
      } catch(err){
        spy()
        expect(err.message).to.equal('Expected Function object in after(), but got undefined')
      }

      expect(spy.calledOnce).to.equal(true)
    })

    it('should error gracefully when passed a string instead of function', function(){
      const spy = sinon.spy()

      try {
        frisby.create(this.test.title)
          .get('http://mock-request/test-object')
          .after('something')
          .toss()
      } catch(err){
        spy()
        expect(err.message).to.equal('Expected Function object in after(), but got string')
      }

      expect(spy.calledOnce).to.equal(true)
    })
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

    it('should error gracefully when passed no function', function(){
      const spy = sinon.spy()

      try {
        frisby.create(this.test.title)
          .get('http://mock-request/test-object')
          .finally()
          .toss()
      } catch(err){
        spy()
        expect(err.message).to.equal('Expected Function object in finally(), but got undefined')
      }

      expect(spy.calledOnce).to.equal(true)
    })

    it('should error gracefully when passed a string instead of function', function(){
      const spy = sinon.spy()

      try {
        frisby.create(this.test.title)
          .get('http://mock-request/test-object')
          .finally('something')
          .toss()
      } catch(err){
        spy()
        expect(err.message).to.equal('Expected Function object in finally(), but got string')
      }

      expect(spy.calledOnce).to.equal(true)
    })

    it('should be invoked after an failed expectation', function() {
      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
          statusCode: 200,
          body: fixtures.singleObject
        })
        .run()

      let finallyInvoked = false

      class FrisbyWithFinishOverride extends frisby {
        _finish (done) {
          super._finish((err) => {
            // TODO: How can I ensure this has been called?
            expect(finallyInvoked).to.be.ok
            done()
          })
        }
      }

      const test = FrisbyWithFinishOverride.create('aaa')
        .get('http://mock-request/test-object', {mock: mockFn})
        // Because this is testing a failed expectation, this deliberately
        // does _not_ match the mock above.
        .expectStatus(204)
        .finally(() => { finallyInvoked = true })

      test.toss()
    })

    it('before hook errors are bundled together', function () {
      const mockFn = mockRequest.mock()
        .get('/test-object')
        .respond({
          statusCode: 200,
          body: fixtures.singleObject
        })
        .run()

      const beforeErrorMessage = 'this-is-the-before-error'
      const finallyErrorMessage = 'this-is-the-finally-error'

      class FrisbyWithFinishOverride extends frisby {
        _finish (done) {
          super._finish((err) => {
            // TODO: How can I ensure this has been called?
            expect(err).to.be.an.instanceOf(MultiError)
            expect(err.errors()).to.have.lengthOf(2)
            expect(err.errors()[0].message).to.equal(beforeErrorMessage)
            expect(err.errors()[1].message).to.equal(finallyErrorMessage)
            done()
          })
        }
      }

      const test = FrisbyWithFinishOverride.create('error bundling')
        .get('http://mock-request/test-object', {mock: mockFn})
        .expectStatus(200)
        .before(() => { throw Error(beforeErrorMessage) })
        .finally(() => { throw Error(finallyErrorMessage) })

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
    const mockFn = mockRequest.mock()
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
        expect(this._outgoing.auth).to.deep.equal({ user: 'frisby', pass: 'passwd', sendImmediately: true })

        // Check to ensure response headers contain basic auth header
        expect(this._response.headers.authorization).to.equal('Basic ZnJpc2J5OnBhc3N3ZA==')
      })
      .toss()
  })

  // reference: https://github.com/vlucas/frisby/issues/213 (does not appear to be an issue in IcedFrisby)
  it('should work with a HTTP 204 responses', function() {
    // Mock API
    const mockFn = mockRequest.mock()
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
    it('should fail with the expected timeout message', function () {
      const timeout = 10

      nock('http://example.com')
        .get('/just-dont-come-back-1')
        .delayBody(50) // delay 50ms
        .reply(200, '<html></html>')

      const spy = sinon.spy()

      frisby.create(this.test.title)
        .get('http://example.com/just-dont-come-back-1')
        .timeout(timeout)
        .exceptionHandler((err) => {
          // TODO How can I assert that this method is called?
          spy()
          expect(err.message).to.equal(`Request timed out after ${timeout} ms`)
          expect(spy.calledOnce).to.equal(true)
        })
        .toss()
    })

    it('should retry the expected number of times after a timeout', function () {
      const retryCount = 4
      let actualRequestCount = 0
      const timeout = 5

      nock('http://example.com')
        .get('/just-dont-come-back-2')
        .delayBody(50) // delay 50ms
        .times(retryCount + 1)
        .reply((uri, requestBody) => {
          actualRequestCount += 1
          return 200, '<html></html>'
        })

      const spy = sinon.spy()

      frisby.create(this.test.title)
        .get('http://example.com/just-dont-come-back-2')
        .timeout(timeout)
        .retry(retryCount, 0)
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          spy()
          expect(err.message).to.equal(`Request timed out after ${timeout} ms (${retryCount + 1} attempts)`)
          expect(spy.calledOnce).to.equal(true)

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

    it('should not retry POST requests', function(){

      let hitCount = 0

      nock('http://example.com')
        .post('/slow-form')
        .delayBody(50) // delay 50ms
        .times(2)
        .reply((uri, requestBody) => {
          spy()
          hitCount++
          return 200
        })

      const spy = sinon.spy()

      frisby.create(this.test.title)
        .post('http://example.com/slow-form')
        .timeout(5)
        .retry(2, 0) //2 retries with 0ms delay between them
        .exceptionHandler(err => {
          //Squash the expected error, keep the rest
          if(!err.message.includes('Request timed out after')){
            throw err
          }
        })
        .finally(() => {
          expect(hitCount).to.equal(1)
          expect(spy.callCount).to.equal(1)
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

    it('should return the current timeout value when not setting a new one', function(){
      const thisFrisby = frisby.create(this.test.title)
      const defaultTimeout = thisFrisby.timeout()
      const newTimeout = thisFrisby.timeout(1000).timeout()

      expect(defaultTimeout).to.equal(5000)
      expect(newTimeout).to.equal(1000)
    })

    it('should set the timeout correctly via config()', function(){
      const thisFrisby = frisby.create(this.test.title).config({timeout: 100})
      const currentTimeout = thisFrisby.timeout()
      expect(currentTimeout).to.equal(100)
    })

    it('should retry the expected number of times after a timeout when set via config()', function(){
      const retryCount = 4
      let actualRequestCount = 0
      const timeout = 5

      nock('http://example.com')
        .get('/just-dont-come-back-3')
        .delayBody(50) // delay 50ms
        .times(5)
        .reply((uri, requestBody) => {
          actualRequestCount += 1
          return 200, '<html></html>'
        })

      const spy = sinon.spy()

      frisby.create(this.test.title)
        .get('http://example.com/just-dont-come-back-3')
        .timeout(timeout)
        .config({retry: retryCount})
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          spy()
          expect(err.message).to.equal(`Request timed out after ${timeout} ms (${retryCount + 1} attempts)`)
          expect(spy.calledOnce).to.equal(true)

          expect(actualRequestCount).to.equal(retryCount + 1)
        })
        .toss()
    })
  })

  it('should handle file uploads', function() {
    nock('http://example.com')
      .post('/file-upload')
      .once()
      .reply(200, {'result': 'ok'})

    // Intercepted with 'nock'
    frisby.create(this.test.title)
      .post('http://example.com/file-upload', {
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

  describe('expectBodyContains', function () {
    it('should fail when the response body is empty', function () {
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
  })

  describe('Aliased functions backwards compatibility', function(){
    it('should allow the use of expectHeaderToMatch as an alias for expectHeader', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, "The payload", {'myheader': 'myvalue'})

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectStatus(201)
        .expectHeaderToMatch('myheader', /myvalue/)
        .toss()
    })
  })

  describe('expectHeader with string', function(){
    //This feels like it's covered in other places, but not explicitly. Included for completeness
    it('should pass when the header value passed exactly matches the content', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['content-type', 'application/json', 'content-length', '7'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeader('content-type','application/json')
        .toss()
    })

    it('should fail when the header value passed is a substring of the content', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['content-type', 'application/json', 'content-length', '7'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeader('content-type','json')
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal("expected an element of [ 'application/json' ] to equal 'json'")
        })
        .toss()
    })

    it('should fail when the header is not present', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['content-type', 'application/json', 'content-length', '7'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeader('Host','example.com')
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal("Header 'host' not present in HTTP response")
        })
        .toss()
    })

    it('should fail when the content is not a string or regex', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['content-type', 'application/json', 'content-length', '7'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeader('content-type',200)
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal("Content '200' is neither a string or regex")
        })
        .toss()
    })

    it('should fail when multiple same-name headers match and the allowMultipleHeaders option is not passed', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeader('Set-Cookie','a=123')
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal("Header 'set-cookie' present more than once in HTTP response. Pass {allowMultipleHeaders: true} in options if this is expected.")
        })
        .toss()
    })

    it('should fail when multiple same-name headers match and the allowMultipleHeaders option is false', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeader('Set-Cookie','a=123',{allowMultipleHeaders: false})
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal("Header 'set-cookie' present more than once in HTTP response. Pass {allowMultipleHeaders: true} in options if this is expected.")
        })
        .toss()
    })

    it('should pass when one of multiple same-name headers matches and the allowMultipleHeaders option is true', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeader('Set-Cookie','a=123',{allowMultipleHeaders: true})
        .expectHeader('Set-Cookie','b=456',{allowMultipleHeaders: true})
        .toss()
    })
  })

  describe('expectHeader with regex', function () {
    it('should pass when regex matches', function() {
      nock('http://example.com')
        .post('/path')
        .once()
        .reply(201, "The payload", {'Location': '/path/23'})

      frisby.create(this.test.title)
        .post('http://example.com/path', {foo: 'bar'})
        .expectStatus(201)
        .expectHeader('location', /^\/path\/\d+$/)
        .toss()
    })

    it('should fail when the regex does not match', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201, 'The payload', {'Location': '/something-else/23'})

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeader('location', /^\/path\/\d+$/)
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(AssertionError)
          expect(err.message).to.equal("expected an element of [ '/something-else/23' ] to match /^\\/path\\/\\d+$/")
        })
        .toss()
    })

    it('should fail when the header is absent', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201)

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeader('location', /^\/path\/\d+$/)
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal("Header 'location' not present in HTTP response")
        })
        .toss()
    })

    it('should fail when multiple same-name headers match and the allowMultipleHeaders option is not passed', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeader('Set-Cookie',/123/)
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal("Header 'set-cookie' present more than once in HTTP response. Pass {allowMultipleHeaders: true} in options if this is expected.")
        })
        .toss()
    })

    it('should fail when multiple same-name headers match and the allowMultipleHeaders option is false', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeader('Set-Cookie',/123/,{allowMultipleHeaders: false})
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal("Header 'set-cookie' present more than once in HTTP response. Pass {allowMultipleHeaders: true} in options if this is expected.")
        })
        .toss()
    })

    it('should pass when one of multiple same-name headers matches and the allowMultipleHeaders option is true', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeader('Set-Cookie',/123/,{allowMultipleHeaders: true})
        .expectHeader('Set-Cookie',/456/,{allowMultipleHeaders: true})
        .toss()
    })
  })

  describe('expectHeaderContains', function () {
    it('should pass when the value passed exactly matches the header content', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['content-type', 'application/json', 'content-length', '7'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeaderContains('content-type','application/json')
        .toss()
    })

    it('should pass when the value passed is a substring of the header content', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['content-type', 'application/json', 'content-length', '7'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeaderContains('content-type','json')
        .toss()
    })

    it('should fail when the value passed is not a substring of the header content', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['content-type', 'application/json', 'content-length', '7'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeaderContains('content-type','xml')
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal("xml not found in application/json: expected an element of [ 'application/json' ] to satisfy [Function]")
        })
        .toss()
    })

    it('should fail when the header is not present', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['content-type', 'application/json', 'content-length', '7'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeaderContains('Host','example.com')
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal("Header 'host' not present in HTTP response")
        })
        .toss()
    })

    it('should fail when multiple same-name headers are found and the allowMultipleHeaders option is not passed', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeaderContains('Set-Cookie','a=')
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal("Header 'set-cookie' present more than once in HTTP response. Pass {allowMultipleHeaders: true} in options if this is expected.")
        })
        .toss()
    })

    it('should fail when multiple same-name headers are found and the allowMultipleHeaders option is false', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeaderContains('Set-Cookie','a=',{allowMultipleHeaders: false})
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal("Header 'set-cookie' present more than once in HTTP response. Pass {allowMultipleHeaders: true} in options if this is expected.")
        })
        .toss()
    })

    it('should pass when one of multiple same-name headers contains the string and the allowMultipleHeaders option is true', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeaderContains('Set-Cookie','a=',{allowMultipleHeaders: true})
        .expectHeaderContains('Set-Cookie','456',{allowMultipleHeaders: true})
        .toss()
    })

    it('should fail when none of multiple same-name headers contains the string', function () {
      nock('http://example.com')
        .post('/path')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectHeaderContains('Set-Cookie','789',{allowMultipleHeaders: true})
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal("789 not found in a=123,b=456: expected an element of [ 'a=123', 'b=456' ] to satisfy [Function]")
        })
        .toss()
    })
  })

  describe('expectNoHeader', function () {
    it('should pass when a header is absent', function() {
      nock('http://example.com')
        .post('/path')
        .once()
        .reply(201, "The payload")

      frisby.create(this.test.title)
        .post('http://example.com/path', {foo: 'bar'})
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

  describe('expectMaxResponseTime', function () {
    it('should pass when the time is less than the threshold', function() {
      nock('http://example.com')
        .post('/path')
        .reply(200,'The payload')

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectMaxResponseTime(500)
        .toss()
    })

    it('should fail when the time is more than the threshold', function() {
      nock('http://example.com')
        .post('/path')
        .delay(501)
        .reply(200,'The payload')

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectMaxResponseTime(500)
        .exceptionHandler(err => {
          expect(err).to.be.an.instanceof(AssertionError)
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

  it('baseUri should set the outgoing URI', function() {
    nock('http://host.example.com')
      .post('/test')
      .once()
      .reply(200, (uri, requestBody) => requestBody)

    frisby.create(this.test.title)
      .baseUri('http://host.example.com')
      .post('/test', {}, {
        body: 'some body here'
      })
      .expectStatus(200)
      .expectBodyContains('some body here')
      .after(function() {
        expect(this._outgoing.uri).to.equal('http://host.example.com/test')
      })
      .toss()
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
    expect(test._inspects).to.have.lengthOf(0)
    test.inspectJSON(() => {})
    expect(test._inspects).to.have.lengthOf(1)
    util.inspect(test)
    expect(test._inspects).to.have.lengthOf(1)
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

  describe('header checks should ignore case for strings', function(){
    it('expectHeader should pass when the header case is mismatched', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, "The payload", {'myHEADER': 'myvalue'})

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectStatus(201)
        .expectHeader('MYheader', 'myvalue')
        .toss()
    })

    it('expectHeader should pass when the content case is mismatched', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, "The payload", {'myheader': 'myVALUE'})

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectStatus(201)
        .expectHeader('myheader', 'MYvalue')
        .toss()
    })

    it('expectNoHeader should fail (detect the header) when the header case is mismatched', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, "The payload", {'myHEADER': 'myVALUE'})

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectStatus(201)
        .expectNoHeader('MYheader')
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(AssertionError)
          expect(err.message).to.equal("expected { myheader: 'myVALUE' } to not have property 'myheader'")
        })
        .toss()
    })

    it('expectHeaderContains should pass when the header case is mismatched', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, "The payload", {'myHEADER': 'myvalue'})

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectStatus(201)
        .expectHeaderContains('MYheader', 'myvalue')
        .toss()
    })

    it('expectHeaderContains should pass when the content case is mismatched', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, "The payload", {'myheader': 'myVALUE'})

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectStatus(201)
        .expectHeaderContains('myheader', 'MYvalue')
        .toss()
    })

    it('expectHeader with regex should fail when the content case is mismatched', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, "The payload", {'myHEADER': 'myVALUE'})

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectStatus(201)
        .expectHeader('MYheader', /MYvalue/)
        .exceptionHandler(err => {
          // TODO How can I assert that this method is called?
          expect(err).to.be.an.instanceof(AssertionError)
          expect(err.message).to.equal("expected an element of [ 'myVALUE' ] to match /MYvalue/")
        })
        .toss()
    })

    it('expectHeader with regex should pass when the case is mismatched and the regex is case-insensitive', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, "The payload", {'myHEADER': 'myVALUE'})

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectStatus(201)
        .expectHeader('MYheader', /MYvalue/i)
        .toss()
    })

    it('expectHeader with regex should pass when the case is matched', function(){
      nock('http://example.com')
        .post('/path')
        .reply(201, "The payload", {'myHEADER': 'myVALUE'})

      frisby.create(this.test.title)
        .post('http://example.com/path')
        .expectStatus(201)
        .expectHeader('MYheader', /myVALUE/)
        .toss()
    })
  })
})

describe('request headers', function () {
  it('addHeaders should add the normalized header to the outgoing request', function() {
    let headers

    const mockFn = mockRequest.mock()
      .get('/test-object-array')
      .respond({
        statusCode: 200,
        body: fixtures.arrayOfObjects
      })
      .run()
    const saveReqHeaders = (outgoing, callback) => {
      headers = outgoing.headers
      mockFn(outgoing, callback)
    }

    frisby.create(this.test.title)
      .get('http://mock-request/test-object-array', {mock: saveReqHeaders})
      .addHeaders({ 'Test': 'Two' })
      .expectStatus(200)
      .after((err, res, body) => {
        expect(headers).to.not.have.property('Test')
        expect(headers).to.have.property('test')
        expect(headers.test).to.equal('Two')
      })
      .toss()
  })

  context('when configured with { json: true }', function() {
    it('applies the expected json header', function() {
      let headers

      const mockFn = mockRequest.mock()
        .post('/json-header')
        .respond({
          statusCode: 200,
          body: fixtures.arrayOfObjects
        })
        .run()
      const saveReqHeaders = (outgoing, callback) => {
        headers = outgoing.headers
        mockFn(outgoing, callback)
      }

      // Intercepted with 'nock'
      frisby.create(this.test.title)
        .config({ json: true })
        .post('http://mock-request/json-header', {}, { mock: saveReqHeaders })
        .expectStatus(200)
        .after((err, res, body) => {
          expect(headers['content-type']).to.equal('application/json')
        })
        .toss()
    })

    context('when configured after _request() is invoked', function() {
      it('still applies the expected json header', function() {
        let headers

        const mockFn = mockRequest.mock()
          .post('/json-header')
          .respond({
            statusCode: 200,
            body: fixtures.arrayOfObjects
          })
          .run()
        const saveReqHeaders = (outgoing, callback) => {
          headers = outgoing.headers
          mockFn(outgoing, callback)
        }

        // Intercepted with 'nock'
        frisby.create(this.test.title)
          .post('http://mock-request/json-header', {}, { mock: saveReqHeaders })
          .config({ json: true })
          .expectStatus(200)
          .after((err, res, body) => {
            expect(headers['content-type']).to.equal('application/json')
          })
          .toss()
      })
    })
  })

  context('when passing params to _request', function () {
    it('should allow for passing raw request body and preserve json:true option', function() {
      nock('http://example.com')
        .post('/json')
        .once()
        .reply(200, {'foo': 'bar'})

      // Intercepted with 'nock'
      frisby.create(this.test.title)
        .post('http://example.com/json', {}, { json: true })
        .expectStatus(200)
        .expectJSON({'foo': 'bar'})
        .expectHeader('Content-Type', 'application/json')
        .after(function(err, res, body) {
          expect(this._outgoing.headers['content-type']).to.equal('application/json')
          expect(this._outgoing.body).to.deep.equal({})
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
          expect(this._outgoing.headers['content-type']).to.equal(customContentType)
          expect(this._outgoing.body).to.deep.equal({})
        })
        .toss()
    })
  })

  context('when passing headers by config()', function(){
    it('config should add the normalized headers to the outgoing request', function(){
      let headers

      const mockFn = mockRequest.mock()
        .get('/test-object-array')
        .respond({
          statusCode: 200,
          body: fixtures.arrayOfObjects
        })
        .run()
      const saveReqHeaders = (outgoing, callback) => {
        headers = outgoing.headers
        mockFn(outgoing, callback)
      }

      frisby.create(this.test.title)
        .get('http://mock-request/test-object-array', {mock: saveReqHeaders})
        .config({
          request:{
            headers: { 'Test': 'Two' }
          }
        })
        .expectStatus(200)
        .after((err, res, body) => {
          expect(headers).to.not.have.property('Test')
          expect(headers).to.have.property('test')
          expect(headers.test).to.equal('Two')
        })
        .toss()
    })
  })

  context('when passing headers by config() and addHeader', function(){
    it('should send all configured headers', function(){
      let outgoingheaders

      const mockFn = mockRequest.mock()
        .get('/test-object-array')
        .respond({
          statusCode: 200,
          body: fixtures.arrayOfObjects
        })
        .run()
      const saveReqHeaders = (outgoing, callback) => {
        outgoingheaders = outgoing.headers
        mockFn(outgoing, callback)
      }

      frisby.create(this.test.title)
        .get('http://mock-request/test-object-array', {mock: saveReqHeaders})
        .config({
          request:{
            headers: { 'one': '1' }
          }
        })
        .addHeader('two','2')
        .expectStatus(200)
        .after((err, res, body) => {
          expect(outgoingheaders).to.have.property('one')
          expect(outgoingheaders.one).to.equal('1')
          expect(outgoingheaders).to.have.property('two')
          expect(outgoingheaders.two).to.equal('2')
        })
        .toss()
    })

    it('addHeader should override config()', function(){
      let outgoingheaders

      const mockFn = mockRequest.mock()
        .get('/test-object-array')
        .respond({
          statusCode: 200,
          body: fixtures.arrayOfObjects
        })
        .run()
      const saveReqHeaders = (outgoing, callback) => {
        outgoingheaders = outgoing.headers
        mockFn(outgoing, callback)
      }

      frisby.create(this.test.title)
        .get('http://mock-request/test-object-array', {mock: saveReqHeaders})
        .config({
          request:{
            headers: { 'three': '3' }
          }
        })
        .addHeader('three','2+1')
        .expectStatus(200)
        .after((err, res, body) => {
          expect(outgoingheaders).to.have.property('three')
          expect(outgoingheaders.three).to.equal('2+1')
        })
        .toss()
    })
  })

  context('when passing headers by params and addHeader', function(){
    it('should send all configured headers', function(){
      let outgoingheaders

      const mockFn = mockRequest.mock()
        .get('/test-object-array')
        .respond({
          statusCode: 200,
          body: fixtures.arrayOfObjects
        })
        .run()
      const saveReqHeaders = (outgoing, callback) => {
        outgoingheaders = outgoing.headers
        mockFn(outgoing, callback)
      }

      frisby.create(this.test.title)
        .get('http://mock-request/test-object-array', {headers: { 'one': '1' }, mock: saveReqHeaders})
        .addHeader('two','2')
        .expectStatus(200)
        .after((err, res, body) => {
          expect(outgoingheaders).to.have.property('one')
          expect(outgoingheaders.one).to.equal('1')
          expect(outgoingheaders).to.have.property('two')
          expect(outgoingheaders.two).to.equal('2')
        })
        .toss()
    })

    it.skip('addHeader should override params', function(){ //Issue #106
      let outgoingheaders

      const mockFn = mockRequest.mock()
        .get('/test-object-array')
        .respond({
          statusCode: 200,
          body: fixtures.arrayOfObjects
        })
        .run()
      const saveReqHeaders = (outgoing, callback) => {
        outgoingheaders = outgoing.headers
        mockFn(outgoing, callback)
      }

      frisby.create(this.test.title)
        .get('http://mock-request/test-object-array', {headers: { 'three': '3' }, mock: saveReqHeaders})
        .addHeader('three','2+1')
        .expectStatus(200)
        .after((err, res, body) => {
          expect(outgoingheaders).to.have.property('three')
          expect(outgoingheaders.three).to.equal('2+1')
        })
        .toss()
    })
  })

  context('when removing headers via removeHeader', function(){
    it('should not send a removed header when it was added via addHeader', function(){
      let headers

      const mockFn = mockRequest.mock()
        .get('/test-object-array')
        .respond({
          statusCode: 200,
          body: fixtures.arrayOfObjects
        })
        .run()
      const saveReqHeaders = (outgoing, callback) => {
        headers = outgoing.headers
        mockFn(outgoing, callback)
      }

      frisby.create(this.test.title)
        .get('http://mock-request/test-object-array', {mock: saveReqHeaders})
        .addHeaders({ 'One': '1', 'Two': '2' })
        .removeHeader('One')
        .expectStatus(200)
        .after((err, res, body) => {
          expect(headers).to.not.have.property('one')
          expect(headers).to.have.property('two')
          expect(headers.two).to.equal('2')
        })
        .toss()
    })

    it.skip('should not send a removed header when it was added via params', function(){ //Issue #122
      let headers

      const mockFn = mockRequest.mock()
        .get('/test-object-array')
        .respond({
          statusCode: 200,
          body: fixtures.arrayOfObjects
        })
        .run()
      const saveReqHeaders = (outgoing, callback) => {
        headers = outgoing.headers
        mockFn(outgoing, callback)
      }

      frisby.create(this.test.title)
        .get('http://mock-request/test-object-array', {mock: saveReqHeaders, headers: { 'One': '1', 'Two': '2' }})
        .removeHeader('One')
        .expectStatus(200)
        .after((err, res, body) => {
          expect(headers).to.not.have.property('one')
          expect(headers).to.have.property('two')
          expect(headers.two).to.equal('2')
        })
        .toss()
    })

    it('should not send a removed header when it was added via config()', function(){
      let headers

      const mockFn = mockRequest.mock()
        .get('/test-object-array')
        .respond({
          statusCode: 200,
          body: fixtures.arrayOfObjects
        })
        .run()
      const saveReqHeaders = (outgoing, callback) => {
        headers = outgoing.headers
        mockFn(outgoing, callback)
      }

      frisby.create(this.test.title)
        .get('http://mock-request/test-object-array', {mock: saveReqHeaders})
        .config({
          request:{
            headers: { 'One': '1', 'Two': '2' }
          }
        })
        .removeHeader('One')
        .expectStatus(200)
        .after((err, res, body) => {
          expect(headers).to.not.have.property('one')
          expect(headers).to.have.property('two')
          expect(headers.two).to.equal('2')
        })
        .toss()
    })

    it('should not send a removed header, regardless of casing', function(){
      let headers

      const mockFn = mockRequest.mock()
        .get('/test-object-array')
        .respond({
          statusCode: 200,
          body: fixtures.arrayOfObjects
        })
        .run()
      const saveReqHeaders = (outgoing, callback) => {
        headers = outgoing.headers
        mockFn(outgoing, callback)
      }

      frisby.create(this.test.title)
        .get('http://mock-request/test-object-array', {mock: saveReqHeaders})
        .addHeaders({ 'One': '1', 'Two': '2' })
        .removeHeader('ONE')
        .expectStatus(200)
        .after((err, res, body) => {
          expect(headers).to.not.have.property('one')
          expect(headers).to.have.property('two')
          expect(headers.two).to.equal('2')
        })
        .toss()
    })

    it('should not error when removing a non-existant header', function(){
      let headers

      const mockFn = mockRequest.mock()
        .get('/test-object-array')
        .respond({
          statusCode: 200,
          body: fixtures.arrayOfObjects
        })
        .run()
      const saveReqHeaders = (outgoing, callback) => {
        headers = outgoing.headers
        mockFn(outgoing, callback)
      }

      frisby.create(this.test.title)
        .get('http://mock-request/test-object-array', {mock: saveReqHeaders})
        .addHeaders({ 'One': '1', 'Two': '2' })
        .removeHeader('Three')
        .expectStatus(200)
        .after((err, res, body) => {
          expect(headers).to.have.property('one')
          expect(headers).to.have.property('two')
          expect(headers.one).to.equal('1')
          expect(headers.two).to.equal('2')
          expect(headers).to.not.have.property('three')
        })
        .toss()
    })
  })
})

describe('Error Handling', function(){
  context('the exceptionHandler function', function(){
    it('should return false when not set and called with no function', function(){
      const thisFrisby = frisby.create(this.test.title).get('http://example.com')
      const initialExH = thisFrisby.exceptionHandler()

      expect(initialExH).to.equal(false)
    })

    it('should return the currently assigned error handler function when called with no function', function(){
      const myExH = function(){ return }
      const thisFrisby = frisby.create(this.test.title).get('http://example.com').exceptionHandler(myExH)
      const setExH = thisFrisby.exceptionHandler()

      expect(setExH).to.equal(myExH)
    })
  })
})
