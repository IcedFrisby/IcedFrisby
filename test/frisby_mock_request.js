'use strict'

const nock = require('nock')
const fixtures = require('./fixtures/repetition_fixture.json')
const frisby = require('../lib/icedfrisby')
const Joi = require('joi')
const { expect, AssertionError } = require('chai')
const { MultiError } = require('verror')
const sinon = require('sinon')
const proxyquire = require('proxyquire').noPreserveCache()

require('chai').use(require('chai-as-promised'))

// Built-in node.js
const fs = require('fs')
const path = require('path')
const util = require('util')

afterEach(function() {
  nock.restore()
  nock.cleanAll()
  nock.enableNetConnect()
  nock.activate()
})

describe('Frisby matchers', function() {
  it('expectStatus for mock request should return 404', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(404)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectStatus(404)
      .run()

    scope.done()
  })

  describe('before callbacks', function() {
    it('should be invoked in sequence before the request', async function() {
      const sequence = []

      const scope = nock('http://example.test')
        .get('/')
        .reply(200, (uri, requestBody) => {
          sequence.push('request')
          return fixtures.singleObject
        })

      await frisby
        .create(this.test.title)
        .before(() => {
          sequence.push('before-one')
        })
        .before(() => {
          sequence.push('before-two')
        })
        .get('http://example.test/')
        .after(() => {
          const expectedSequence = ['before-one', 'before-two', 'request']
          expect(sequence).to.deep.equal(expectedSequence)
        })
        .run()

      scope.done()
    })

    it('should respect the exception handler', async function() {
      const gotException = sinon.spy()

      const message = 'this is the error'

      await frisby
        .create(this.test.title)
        .before(() => {
          throw new Error(message)
        })
        // Due to the exception in `before()`, the request is never made.
        .get('http://example.test/')
        .exceptionHandler(err => {
          expect(err.message).to.equal(message)
          gotException()
        })
        .run()

      expect(gotException.calledOnce).to.equal(true)
    })

    it('should error gracefully when passed no function', async function() {
      expect(() => frisby.create(this.test.title).before()).to.throw(
        Error,
        'Expected Function object in before(), but got undefined'
      )
    })

    it('should error gracefully when passed a string instead of function', async function() {
      expect(() => frisby.create(this.test.title).before('something')).to.throw(
        Error,
        'Expected Function object in before(), but got string'
      )
    })

    it('should wait the configured period before proceeding to the request', async function() {
      const waits = 75

      const scope = nock('http://example.test')
        .get('/')
        .reply(404)

      let timeDelta = new Date().getTime()

      await frisby
        .create(this.test.title)
        .waits(waits)
        .get('http://example.test/')
        .run()

      scope.done()

      timeDelta = new Date().getTime() - timeDelta
      expect(timeDelta).to.be.at.least(waits)
      expect(timeDelta).to.be.below(waits + 50)
    })
  })

  describe('before callbacks (async)', function() {
    it('should be invoked in sequence before the request', async function() {
      const sequence = []

      nock('http://example.test')
        .get('/')
        .reply(200, () => {
          sequence.push('request')
          return fixtures.singleObject
        })

      await frisby
        .create(this.test.title)
        .before(done => {
          setTimeout(function() {
            sequence.push('before-one')
            done()
          }, 10)
        })
        .before(() => {
          sequence.push('before-two')
        })
        .before(done => {
          setTimeout(function() {
            sequence.push('before-three')
            done()
          }, 10)
        })
        .get('http://example.test/')
        .run()

      expect(sequence).to.deep.equal([
        'before-one',
        'before-two',
        'before-three',
        'request',
      ])
    })

    it('should respect the exception handler', async function() {
      const gotException = sinon.spy()
      const message = 'this is the error'

      const scope = nock('http://example.test')
        .get('/')
        .reply(200, fixtures.singleObject)

      await frisby
        .create(this.test.title)
        .before(done => {
          throw new Error(message)
        })
        .get('http://example.test/')
        .exceptionHandler(err => {
          expect(err.message).to.equal(message)
          gotException()
        })
        .run()

      expect(gotException.calledOnce).to.be.true
      scope.done()
    })
  })

  it('expectJSON should test EQUALITY for a SINGLE object', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.singleObject)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSON({
        test_str: 'Hey Hai Hello',
        test_str_same: 'I am the same...',
        test_int: 1,
        test_optional: null,
      })
      .run()

    scope.done()
  })

  it('expectJSON should test INEQUALITY for a SINGLE object', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.singleObject)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .not()
      .expectJSON({
        test_str: 'Bye bye bye!',
        test_str_same: 'I am not the same...',
        test_int: 9,
        test_optional: true,
      })
      .run()

    scope.done()
  })

  it('expectJSON should test EQUALITY for EACH object in an array with an asterisk path', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.sameNumbers)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSON('*', { num: 5 })
      .run()

    scope.done()
  })

  it('expectJSON should test INEQUALITY for EACH object in an array with an asterisk path', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.sameNumbers)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .not()
      .expectJSON('*', { num: 123 })
      .run()

    scope.done()
  })

  it('expectJSON should test EACH object in an array with path ending with asterisk', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSONTypes('test_subjects.*', {
        // * == EACH object in here should match
        test_str_same: Joi.string().valid('I am the same...'),
        test_int: Joi.number(),
        test_str: Joi.string(),
        test_optional: Joi.any().optional(),
      })
      .run()

    scope.done()
  })

  it('expectJSON should match ONE object in an array with path ending with question mark', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSONTypes('test_subjects.?', {
        // ? == ONE object in here should match (contains)
        test_str_same: Joi.string().valid('I am the same...'),
        test_int: Joi.number().valid(43),
        test_str: Joi.string().valid('I am a string two!'),
        test_optional: Joi.any().optional(),
      })
      .run()

    scope.done()
  })

  it('expectJSON should throw an error when response is not JSON', async function() {
    const gotException = sinon.spy()
    const responseBody = 'Payload'

    const scope = nock('http://example.test')
      .post('/')
      .reply(200, responseBody)

    await frisby
      .create(this.test.title)
      .post('http://example.test/')
      .expectJSON({ foo: 'bar' })
      .exceptionHandler(err => {
        expect(err).to.be.an.instanceof(Error)
        expect(err.message).to.equal(
          'Error parsing JSON string: Unexpected token P in JSON at position 0\n\tGiven: Payload'
        )
        gotException()
      })
      .run()

    expect(gotException.calledOnce).to.be.true
    scope.done()
  })

  it('expectJSONTypes should fail with a helpful message', async function() {
    const frisbyWithoutJoi = proxyquire('../lib/icedfrisby', {
      './pathMatch': proxyquire('../lib/pathMatch', { joi: null }),
    })

    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.singleObject)

    await frisbyWithoutJoi
      .create(this.test.title)
      .get('http://example.test/')
      .expectStatus(200)
      .expectJSONTypes({ foo: 'bar' })
      .exceptionHandler(err => {
        // TODO How can I assert that this method is called?
        expect(err.message).to.equal(
          'Joi is required to use expectJSONTypes, and must be installed separately'
        )
      })
      .run()

    scope.done()
  })

  it('expectJSON should NOT match ONE object in an array with path ending with question mark', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .not()
      .expectJSON('test_subjects.?', {
        // ? == ONE object in 'test_subjects' array
        test_str: 'I am a string two nonsense!',
        test_int: 4433,
      })
      .run()

    scope.done()
  })

  it('expectContainsJSON should MATCH fields for a SINGLE object', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.singleObject)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectContainsJSON({
        test_str: 'Hey Hai Hello',
        // test_str_same: "I am the same...", // leave this out of the orig object, should still match
        test_int: 1,
        test_optional: null,
      })
      .run()

    scope.done()
  })

  it('expectContainsJSON should NOT MATCH for a SINGLE object', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.singleObject)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .not()
      .expectContainsJSON({
        test_str: 'Bye bye bye!',
        test_str_same: 'I am not the same...',
        test_int: 9,
        test_optional: true,
      })
      .run()

    scope.done()
  })

  it('expectContainsJSON should NOT MATCH for a SINGLE object with a single field', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.singleObject)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .not()
      .expectContainsJSON({
        test_str: 'Bye bye bye!',
        // test_str_same: "I am not the same...",
        // test_int: 9,
        // test_optional: true
      })
      .run()

    scope.done()
  })

  it('expectContainsJSON should MATCH for EACH object in an array with an asterisk path', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.sameNumbers)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectContainsJSON('*', { num: 5 })
      .run()

    scope.done()
  })

  it('expectContainsJSON should NOT MATCH for EACH object in an array with an asterisk path', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.sameNumbers)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .not()
      .expectContainsJSON('*', { num: 123 })
      .run()

    scope.done()
  })

  it('expectContainsJSON should MATCH for EACH object in an array with path ending with asterisk', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test')
      .expectContainsJSON('test_subjects.*', {
        // * == EACH object in here should match
        test_str_same: 'I am the same...',
      })
      .run()

    scope.done()
  })

  it('expectContainsJSON should MATCH ONE object in an array with path ending with question mark', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectContainsJSON('test_subjects.?', {
        // ? == ONE object in here should match (contains)
        test_str: 'I am a string two!',
      })
      .run()

    scope.done()
  })

  it('expectContainsJSON should NOT MATCH ONE object in an array with path ending with question mark', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test')
      .not()
      .expectContainsJSON('test_subjects.?', {
        // ? == ONE object in 'test_subjects' array
        test_str: 'I am a string two nonsense!',
      })
      .run()

    scope.done()
  })

  it('expectJSONTypes should NOT match ONE object in an array with path ending with question mark', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test')
      .not()
      .expectJSONTypes('test_subjects.?', {
        // ? == ONE object in 'test_subjects' array
        test_str: Joi.boolean(),
        test_int: Joi.string(),
      })
      .run()

    scope.done()
  })

  it('expectJSONLength should properly count arrays, strings, and objects', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSONLength('test_subjects', 3)
      .expectJSONLength('test_subjects.0', 4)
      .expectJSONLength('some_string', 9)
      .run()

    scope.done()
  })

  it('expectJSONLength should support an asterisk in the path to test all elements of an array', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSONLength('test_subjects.*', 4)
      .run()

    scope.done()
  })

  it('expectJSONLength should support an asterisk in the path to test that all elements of an array do NOT have a specified length', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .not()
      .get('http://example.test')
      .expectJSONLength('test_subjects.*', 3)
      .expectJSONLength('test_subjects.*', 5)
      .run()

    scope.done()
  })

  it('expectJSONLength should properly count arrays, strings, and objects using <=', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test')
      .expectJSONLength('test_subjects', '<=3')
      .expectJSONLength('test_subjects.0', '<=4')
      .expectJSONLength('some_string', '<=9')
      .run()

    scope.done()
  })

  it('expectJSONLength should support an asterisk in the path to test all elements of an array using <=', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSONLength('test_subjects.*', '<=4')
      .run()

    scope.done()
  })

  it('expectJSONLength should properly count arrays, strings, and objects using <', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSONLength('test_subjects', '<4')
      .expectJSONLength('test_subjects.0', '<5')
      .expectJSONLength('some_string', '<10')
      .run()

    scope.done()
  })

  it('expectJSONLength should support an asterisk in the path to test all elements of an array using <', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSONLength('test_subjects.*', '<5')
      .run()

    scope.done()
  })

  it('expectJSONLength should properly count arrays, strings, and objects using >=', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSONLength('test_subjects', '>=3')
      .expectJSONLength('test_subjects.0', '>=4')
      .expectJSONLength('some_string', '>=9')
      .run()

    scope.done()
  })

  it('expectJSONLength should support an asterisk in the path to test all elements of an array using >=', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSONLength('test_subjects.*', '>=4')
      .run()

    scope.done()
  })

  it('expectJSONLength should properly count arrays, strings, and objects using >', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSONLength('test_subjects', '>2')
      .expectJSONLength('test_subjects.0', '>3')
      .expectJSONLength('some_string', '>8')
      .run()

    scope.done()
  })

  it('expectJSONLength should support an asterisk in the path to test all elements of an array using >', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSONLength('test_subjects.*', '>3')
      .run()

    scope.done()
  })

  it('expectJSONLength should properly count arrays, strings, and objects testing string number', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSONLength('test_subjects', '3')
      .expectJSONLength('test_subjects.0', '4')
      .expectJSONLength('some_string', '9')
      .run()

    scope.done()
  })

  it('expectJSONLength should support an asterisk in the path to test all elements of an array testing string number', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.arrayOfObjects)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectJSONLength('test_subjects.*', '4')
      .run()

    scope.done()
  })

  describe('after() callbacks', function() {
    it('should be invoked in sequence after a successful request', async function() {
      const sequence = []

      const scope = nock('http://example.test')
        .get('/')
        .reply(200, (uri, requestBody) => {
          sequence.push('request')
          return fixtures.singleObject
        })

      await frisby
        .create(this.test.title)
        .get('http://example.test/')
        .expectStatus(200)
        .after(() => {
          sequence.push('after-one')
        })
        .after(function() {
          this.after(() => {
            sequence.push('after-dynamic')
          })
        })
        .after(() => {
          sequence.push('after-two')
        })
        .run()

      expect(sequence).to.deep.equal([
        'request',
        'after-one',
        'after-two',
        'after-dynamic',
      ])
      scope.done()
    })

    it('should not be invoked after an failed expectation', async function() {
      const scope = nock('http://example.test')
        .get('/')
        .reply(200, fixtures.singleObject)

      const test = frisby
        .create('aaa')
        .get('http://example.test/')
        .expectStatus(204)
        .after(() => {
          expect.fail("The after function shouldn't be invoked")
        })

      // Intercept the raised exception to prevent Mocha from receiving it.
      test._invokeExpects = function(done) {
        try {
          test.prototype._invokeExpects.call(test, done)
        } catch (e) {
          done()
          return
        }
        // If we catch the exeption, as expected, we should never get here.
        expect.fail('The failed expectation should have raised an exception')
      }

      await test.run()

      scope.done()
    })

    it('TODO: should not be invoked after a test failure')

    // TODO: This is failing; not sure if it's due to the rewrite, or a previous
    // change, or if it was broken before, too.
    it.skip('should not be invoked after a previous after hook raised an exception', async function() {
      const afterCalled = sinon.spy()

      const scope = nock('http://example.test')
        .get('/')
        .reply(200, fixtures.singleObject)

      await frisby
        .create(this.test.title)
        .get('http://example.test/')
        .expectStatus(200)
        .exceptionHandler(() => {}) // Swallow the exception that is thrown below.
        .after(() => {
          afterCalled()
          throw Error('Error in first after()')
        })
        .after(() => {
          afterCalled()
        })
        .run()

      expect(afterCalled.calledOnce).to.equal(true)
      scope.done()
    })

    it('should error gracefully when passed no function', function() {
      expect(() =>
        frisby
          .create(this.test.title)
          .get('http://mock-request/test-object')
          .after()
      ).to.throw(
        Error,
        'Expected Function object in after(), but got undefined'
      )
    })

    it('should error gracefully when passed a string instead of function', function() {
      expect(() =>
        frisby
          .create(this.test.title)
          .get('http://mock-request/test-object')
          .after('something')
      ).to.throw(Error, 'Expected Function object in after(), but got string')
    })
  })

  describe('after() callbacks (async)', function() {
    it('should be invoked in sequence after a successful request', async function() {
      const sequence = []

      const scope = nock('http://example.test')
        .get('/')
        .reply(200, (uri, requestBody) => {
          sequence.push('request')
          return fixtures.singleObject
        })

      await frisby
        .create(this.test.title)
        .get('http://example.test/')
        .expectStatus(200)
        .after(() => {
          sequence.push('after-one')
        })
        .after(function(error, res, body, headers, done) {
          setTimeout(() => {
            sequence.push('after-two')
            this.after(() => {
              sequence.push('after-dynamic')
            })
            done()
          }, 10)
        })
        .after(() => {
          sequence.push('after-three')
        })
        .run()

      expect(sequence).to.deep.equal([
        'request',
        'after-one',
        'after-two',
        'after-three',
        'after-dynamic',
      ])

      scope.done()
    })
  })

  describe('finally() hooks', function() {
    // Not sure if this is a new problem, or has just surfaced because it's
    // been rewritten.
    it.skip('should be invoked in sequence after after() hooks', async function() {
      const sequence = []

      const scope = nock('http://example.test')
        .get('/')
        .reply(200, (uri, requestBody) => {
          sequence.push('request')
          return fixtures.singleObject
        })

      await frisby
        .create(this.test.title)
        .get('http://example.test')
        .expectStatus(200)
        .after(() => {
          sequence.push('after-one')
        })
        .after(() => {
          sequence.push('after-two')
        })
        .after(function() {
          this.finally(() => {
            sequence.push('finally-dynamic')
          })
        }) // should be invoked even later, so it won't register below
        .finally(() => {
          sequence.push('finally-one')
        })
        .finally(() => {
          sequence.push('finally-two')
        })
        .run()

      expect(sequence).to.deep.equal([
        'request',
        'after-one',
        'after-two',
        'finally-one',
        'finally-two',
      ])

      scope.done()
    })

    it('should error gracefully when passed no function', function() {
      expect(() =>
        frisby
          .create(this.test.title)
          .get('http://mock-request/test-object')
          .finally()
      ).to.throw(
        Error,
        'Expected Function object in finally(), but got undefined'
      )
    })

    it('should error gracefully when passed a string instead of function', function() {
      expect(() =>
        frisby
          .create(this.test.title)
          .get('http://mock-request/test-object')
          .finally('something')
      ).to.throw(Error, 'Expected Function object in finally(), but got string')
    })

    it('should be invoked after an failed expectation', async function() {
      const finallyInvoked = sinon.spy()

      const scope = nock('http://example.test')
        .get('/')
        .reply(200, fixtures.singleObject)

      await expect(
        frisby
          .create('aaa')
          .get('http://example.test/')
          .expectStatus(204)
          .finally(() => {
            finallyInvoked()
          })
          .run()
      ).to.be.rejectedWith(AssertionError, 'expected 200 to equal 204')

      expect(finallyInvoked.calledOnce).to.be.true
      scope.done()
    })

    it('before hook errors are bundled together', async function() {
      const beforeErrorMessage = 'this-is-the-before-error'
      const finallyErrorMessage = 'this-is-the-finally-error'

      const test = frisby
        .create('error bundling')
        // Due to the exception in `before()`, this request is never sent.
        .get('http://example.test/')
        .expectStatus(200)
        .before(() => {
          throw Error(beforeErrorMessage)
        })
        .finally(() => {
          throw Error(finallyErrorMessage)
        })

      try {
        await test.run()
      } catch (err) {
        expect(err).to.be.an.instanceOf(MultiError)
        expect(err.errors()).to.have.lengthOf(2)
        expect(err.errors()[0].message).to.equal(beforeErrorMessage)
        expect(err.errors()[1].message).to.equal(finallyErrorMessage)
      }
    })
  })

  it('Frisby basicAuth should set the correct HTTP Authorization header', async function() {
    const scope = nock('http://example.test', {
      reqheaders: {
        Authorization: `Basic ${Buffer.from('frisby:passwd').toString(
          'base64'
        )}`,
      },
    })
      .get('/')
      .reply(200)

    const test = frisby
      .create(this.test.title)
      .get('http://example.test')
      .auth('frisby', 'passwd')
      .expectStatus(200)

    await test.run()

    expect(test._outgoing.auth).to.deep.equal({
      user: 'frisby',
      pass: 'passwd',
      sendImmediately: true,
    })

    scope.done()
  })

  // reference: https://github.com/vlucas/frisby/issues/213 (does not appear to be an issue in IcedFrisby)
  it('should work with a HTTP 204 responses', async function() {
    const scope = nock('http://example.test')
      .get('/')
      .reply(204)

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectStatus(204)
      .run()

    scope.done()
  })

  it('Invalid URLs should fail with a 599 status code', async function() {
    await frisby
      .create(this.test.title)
      .get('invalid-url')
      .expectStatus(599)
      .timeout(5)
      .run()
  })

  describe('timeouts and retries', function() {
    it('should fail with the expected timeout message', async function() {
      const scope = nock('http://example.test')
        .get('/just-dont-come-back-1')
        .delayBody(30)
        .reply(200, '<html></html>')

      const timeout = 10

      await expect(
        frisby
          .create(this.test.title)
          .get('http://example.test/just-dont-come-back-1')
          .timeout(timeout)
          .run()
      ).to.be.rejectedWith(Error, `Request timed out after ${timeout} ms`)

      scope.done()
    })

    it('should retry the expected number of times after a timeout', async function() {
      const retryCount = 4
      let actualRequestCount = 0
      const timeout = 5

      const scope = nock('http://example.test')
        .get('/just-dont-come-back-2')
        .delayBody(50)
        .times(retryCount + 1)
        .reply((uri, requestBody) => {
          actualRequestCount += 1
          return 200, '<html></html>'
        })

      await expect(
        frisby
          .create(this.test.title)
          .get('http://example.test/just-dont-come-back-2')
          .timeout(timeout)
          .retry(retryCount, 0)
          .run()
      ).to.be.rejectedWith(
        Error,
        `Request timed out after ${timeout} ms (${retryCount + 1} attempts)`
      )

      expect(actualRequestCount).to.equal(retryCount + 1)
      scope.done()
    })

    it('should delay retries by the backoff amount', async function() {
      let actualRequestCount = 0
      let firstRequestTime
      let secondRequestTime

      const scope = nock('http://example.test')
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

      await frisby
        .create(this.test.title)
        .get('http://example.test/fail-once')
        .retry(1, expectedBackoffMillis)
        .run()

      const [seconds, nanoseconds] = secondRequestTime
      const timeBetweenRequestsMillis = 1e3 * seconds + 1e-6 * nanoseconds

      const assertionGracePeriodMillis = 25
      expect(timeBetweenRequestsMillis).to.be.within(
        expectedBackoffMillis,
        expectedBackoffMillis + assertionGracePeriodMillis
      )

      scope.done()
    })

    it('should not retry POST requests', async function() {
      const gotRequest = sinon.spy()

      nock('http://example.test')
        .post('/')
        .delayBody(50)
        .reply(200, (uri, requestBody) => {
          gotRequest()
          return 200
        })

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .timeout(5)
          .retry(2, 0) // 2 retries with 0ms delay between them.
          .run()
      ).to.be.rejectedWith(Error, 'Request timed out after')

      expect(gotRequest.calledOnce).to.be.true

      nock.cleanAll()
    })

    it('should pass the expected timeout to mocha, and not cause mocha to time out', async function() {
      let requestCount = 0

      nock('http://example.test')
        .get('/fail-four-times')
        .delay(50)
        .twice()
        .reply((uri, requestBody) => {
          requestCount += 1
          switch (requestCount) {
            case 1:
              return [500, 'Fake server error']
            case 2:
              return [200]
            default:
              throw Error('Expected only two requests')
          }
        })

      const test = frisby
        .create(this.test.title)
        .get('http://example.test/fail-four-times')
        .timeout(75)
        .retry(1, 50)
        .expectStatus(200)

      const gracePeriodMillis = 25
      expect(test._mochaTimeout()).to.equal(75 + 50 + 75 + gracePeriodMillis)

      await test.run()
    })

    it('should return the current timeout value when not setting a new one', function() {
      const thisFrisby = frisby.create(this.test.title)
      const defaultTimeout = thisFrisby.timeout()
      const newTimeout = thisFrisby.timeout(1000).timeout()

      expect(defaultTimeout).to.equal(5000)
      expect(newTimeout).to.equal(1000)
    })

    it('should set the timeout correctly via config()', function() {
      const thisFrisby = frisby.create(this.test.title).config({ timeout: 100 })
      const currentTimeout = thisFrisby.timeout()
      expect(currentTimeout).to.equal(100)
    })

    it('should retry the expected number of times after a timeout when set via config()', async function() {
      const retryCount = 4
      const timeout = 5

      const scope = nock('http://example.test')
        .get('/')
        .delayBody(timeout + 50)
        .times(retryCount + 1)
        .reply(200, '<html></html>')

      const test = frisby
        .create(this.test.title)
        .get('http://example.test')
        .timeout(timeout)
        .config({ retry: retryCount })

      // TODO: Add this to the `config()` API.
      test._attempts.backoffMillis = 0

      await expect(test.run()).to.be.rejectedWith(
        Error,
        `Request timed out after ${timeout} ms (${retryCount + 1} attempts)`
      )

      scope.done()
    })
  })

  it('should handle file uploads', async function() {
    const scope = nock('http://example.test')
      .post('/')
      .reply(200, { result: 'ok' })

    await frisby
      .create(this.test.title)
      .post(
        'http://example.test/',
        {
          name: 'Test Upload',
          file: fs.createReadStream(path.join(__dirname, 'logo-frisby.png')),
        },
        { form: true }
      )
      .expectStatus(200)
      .run()

    scope.done()
  })

  it('should allow for passing raw request body', async function() {
    const scope = nock('http://example.test')
      .post('/')
      // Echo the body back to the client.
      .reply(200, (uri, requestBody) => requestBody)

    await frisby
      .create(this.test.title)
      .post(
        'http://example.test/',
        {},
        {
          body: 'some body here',
        }
      )
      .expectStatus(200)
      .expectBodyContains('some body here')
      .run()

    scope.done()
  })

  describe('expectBodyContains', function() {
    it('should fail when the response body is empty', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201)

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectBodyContains('this-will-not-match')
          .run()
      ).to.be.rejectedWith(
        AssertionError,
        "expected '' to include 'this-will-not-match'"
      )

      scope.done()
    })
  })

  describe('Aliased functions backwards compatibility', function() {
    it('should allow the use of expectHeaderToMatch as an alias for expectHeader', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'The payload', { myheader: 'myvalue' })

      await frisby
        .create(this.test.title)
        .post('http://example.test/')
        .expectStatus(201)
        .expectHeaderToMatch('myheader', /myvalue/)
        .run()

      scope.done()
    })
  })

  describe('expectHeader with string', function() {
    // This feels like it's covered in other places, but not explicitly.
    // Included for completeness.
    it('should pass when the header value passed exactly matches the content', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', [
          'content-type',
          'application/json',
          'content-length',
          '7',
        ])

      await frisby
        .create(this.test.title)
        .post('http://example.test/')
        .expectHeader('content-type', 'application/json')
        .run()

      scope.done()
    })

    it('should fail when the header value passed is a substring of the content', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', [
          'content-type',
          'application/json',
          'content-length',
          '7',
        ])

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectHeader('content-type', 'json')
          .run()
      ).to.be.rejectedWith(
        Error,
        "expected an element of [ 'application/json' ] to equal 'json'"
      )

      scope.done()
    })

    it('should fail when the header is not present', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', [
          'content-type',
          'application/json',
          'content-length',
          '7',
        ])

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectHeader('Host', 'example.test')
          .run()
      ).to.be.rejectedWith(Error, "Header 'host' not present in HTTP response")

      scope.done()
    })

    it('should fail when the content is not a string or regex', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', [
          'content-type',
          'application/json',
          'content-length',
          '7',
        ])

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectHeader('content-type', 200)
          .run()
      ).to.be.rejectedWith(Error, "Content '200' is neither a string or regex")

      scope.done()
    })

    it('should fail when multiple same-name headers match and the allowMultipleHeaders option is not passed', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectHeader('Set-Cookie', 'a=123')
          .run()
      ).to.be.rejectedWith(
        Error,
        "Header 'set-cookie' present more than once in HTTP response. Pass {allowMultipleHeaders: true} in options if this is expected."
      )

      scope.done()
    })

    it('should fail when multiple same-name headers match and the allowMultipleHeaders option is false', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectHeader('Set-Cookie', 'a=123', { allowMultipleHeaders: false })
          .run()
      ).to.be.rejectedWith(
        Error,
        "Header 'set-cookie' present more than once in HTTP response. Pass {allowMultipleHeaders: true} in options if this is expected."
      )

      scope.done()
    })

    it('should pass when one of multiple same-name headers matches and the allowMultipleHeaders option is true', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      await frisby
        .create(this.test.title)
        .post('http://example.test/')
        .expectHeader('Set-Cookie', 'a=123', { allowMultipleHeaders: true })
        .expectHeader('Set-Cookie', 'b=456', { allowMultipleHeaders: true })
        .run()

      scope.done()
    })
  })

  describe('expectHeader with regex', function() {
    it('should pass when regex matches', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .once()
        .reply(201, 'The payload', { Location: '/path/23' })

      await frisby
        .create(this.test.title)
        .post('http://example.test/', { foo: 'bar' })
        .expectStatus(201)
        .expectHeader('location', /^\/path\/\d+$/)
        .run()

      scope.done()
    })

    it('should fail when the regex does not match', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'The payload', { Location: '/something-else/23' })

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectHeader('location', /^\/path\/\d+$/)
          .run()
      ).to.be.rejectedWith(
        AssertionError,
        "expected an element of [ '/something-else/23' ] to match /^\\/path\\/\\d+$/"
      )

      scope.done()
    })

    it('should fail when the header is absent', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201)

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectHeader('location', /^\/path\/\d+$/)
          .run()
      ).to.be.rejectedWith(
        Error,
        "Header 'location' not present in HTTP response"
      )

      scope.done()
    })

    it('should fail when multiple same-name headers match and the allowMultipleHeaders option is not passed', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectHeader('Set-Cookie', /123/)
          .run()
      ).to.be.rejectedWith(
        Error,
        "Header 'set-cookie' present more than once in HTTP response. Pass {allowMultipleHeaders: true} in options if this is expected."
      )

      scope.done()
    })

    it('should fail when multiple same-name headers match and the allowMultipleHeaders option is false', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectHeader('Set-Cookie', /123/, { allowMultipleHeaders: false })
          .run()
      ).to.be.rejectedWith(
        Error,
        "Header 'set-cookie' present more than once in HTTP response. Pass {allowMultipleHeaders: true} in options if this is expected."
      )

      scope.done()
    })

    it('should pass when one of multiple same-name headers matches and the allowMultipleHeaders option is true', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      await frisby
        .create(this.test.title)
        .post('http://example.test/')
        .expectHeader('Set-Cookie', /123/, { allowMultipleHeaders: true })
        .expectHeader('Set-Cookie', /456/, { allowMultipleHeaders: true })
        .run()

      scope.done()
    })
  })

  describe('expectHeaderContains', function() {
    it('should pass when the value passed exactly matches the header content', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', [
          'content-type',
          'application/json',
          'content-length',
          '7',
        ])

      await frisby
        .create(this.test.title)
        .post('http://example.test/')
        .expectHeaderContains('content-type', 'application/json')
        .run()

      scope.done()
    })

    it('should pass when the value passed is a substring of the header content', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', [
          'content-type',
          'application/json',
          'content-length',
          '7',
        ])

      await frisby
        .create(this.test.title)
        .post('http://example.test/')
        .expectHeaderContains('content-type', 'json')
        .run()

      scope.done()
    })

    it('should fail when the value passed is not a substring of the header content', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', [
          'content-type',
          'application/json',
          'content-length',
          '7',
        ])

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectHeaderContains('content-type', 'xml')
          .run()
      ).to.be.rejectedWith(
        Error,
        "xml not found in application/json: expected an element of [ 'application/json' ] to satisfy [Function]"
      )

      scope.done()
    })

    it('should fail when the header is not present', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', [
          'content-type',
          'application/json',
          'content-length',
          '7',
        ])

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectHeaderContains('Host', 'example.test')
          .run()
      ).to.be.rejectedWith(Error, "Header 'host' not present in HTTP response")

      scope.done()
    })

    it('should fail when multiple same-name headers are found and the allowMultipleHeaders option is not passed', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectHeaderContains('Set-Cookie', 'a=')
          .run()
      ).to.be.rejectedWith(
        Error,
        "Header 'set-cookie' present more than once in HTTP response. Pass {allowMultipleHeaders: true} in options if this is expected."
      )

      scope.done()
    })

    it('should fail when multiple same-name headers are found and the allowMultipleHeaders option is false', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectHeaderContains('Set-Cookie', 'a=', {
            allowMultipleHeaders: false,
          })
          .run()
      ).to.be.rejectedWith(
        Error,
        "Header 'set-cookie' present more than once in HTTP response. Pass {allowMultipleHeaders: true} in options if this is expected."
      )

      scope.done()
    })

    it('should pass when one of multiple same-name headers contains the string and the allowMultipleHeaders option is true', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      await frisby
        .create(this.test.title)
        .post('http://example.test/')
        .expectHeaderContains('Set-Cookie', 'a=', {
          allowMultipleHeaders: true,
        })
        .expectHeaderContains('Set-Cookie', '456', {
          allowMultipleHeaders: true,
        })
        .run()

      scope.done()
    })

    it('should fail when none of multiple same-name headers contains the string', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'Payload', ['Set-Cookie', 'a=123', 'Set-Cookie', 'b=456'])

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectHeaderContains('Set-Cookie', '789', {
            allowMultipleHeaders: true,
          })
          .run()
      ).to.be.rejectedWith(
        Error,
        "789 not found in a=123,b=456: expected an element of [ 'a=123', 'b=456' ] to satisfy [Function]"
      )

      scope.done()
    })
  })

  describe('expectNoHeader', function() {
    it('should pass when a header is absent', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'The payload')

      await frisby
        .create(this.test.title)
        .post('http://example.test/', { foo: 'bar' })
        .expectStatus(201)
        .expectNoHeader('Location')
        .expectNoHeader('location')
        .run()

      scope.done()
    })

    it('should fail when a header is present', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'The payload', { Location: '/something-else/23' })

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectNoHeader('Location')
          .run()
      ).to.be.rejectedWith(
        AssertionError,
        "expected { location: '/something-else/23' } to not have property 'location'"
      )

      scope.done()
    })
  })

  describe('expectMaxResponseTime', function() {
    it('should pass when the time is less than the threshold', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(200, 'The payload')

      await frisby
        .create(this.test.title)
        .post('http://example.test/')
        .expectMaxResponseTime(500)
        .run()

      scope.done()
    })

    it('should fail when the time is more than the threshold', async function() {
      const maxResponseTime = 25
      const delay = maxResponseTime + 25

      const scope = nock('http://example.test')
        .post('/')
        .delay(delay)
        .reply(200, 'The payload')

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectMaxResponseTime(maxResponseTime)
          .run()
      ).to.be.rejectedWith(AssertionError, /^expected \d+ to be below 25/)

      scope.done()
    })
  })

  it('afterJSON should be invoked with the body json', async function() {
    const afterJSONInvoked = sinon.spy()

    const scope = nock('http://example.test')
      .get('/')
      .reply(200, { foo: 'bar' })

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .expectStatus(200)
      .expectJSON({ foo: 'bar' })
      .afterJSON(json => {
        expect(json).to.deep.equal({ foo: 'bar' })
        afterJSONInvoked()
      })
      .run()

    expect(afterJSONInvoked.calledOnce).to.be.true
    scope.done()
  })

  it('baseUri should set the outgoing URI', async function() {
    const scope = nock('http://host.example.test')
      .post('/deeplink/item.json')
      .once()
      .reply(200, (uri, requestBody) => requestBody)

    const test = frisby
      .create(this.test.title)
      .baseUri('http://host.example.test/deeplink')
      .post(
        '/item.json',
        {},
        {
          body: 'some body here',
        }
      )
      .expectStatus(200)
      .expectBodyContains('some body here')

    await test.run()

    expect(test._outgoing.uri).to.equal(
      'http://host.example.test/deeplink/item.json'
    )

    scope.done()
  })

  describe('Other HTTP methods', function() {
    it('delete()', async function() {
      const scope = nock('http://example.test')
        .delete('/')
        .query({ name: 'sally' })
        .reply(204, (uri, requestBody) => requestBody)

      await frisby
        .create(this.test.title)
        .delete(
          'http://example.test/',
          {},
          {
            qs: { name: 'sally' },
            body: 'some body here',
          }
        )
        .expectStatus(204)
        .expectBodyContains('some body here')
        .run()

      scope.done()
    })

    it('head()', async function() {
      const scope = nock('http://example.test')
        .head('/')
        .query({ name: 'sally' })
        .reply(204, (uri, requestBody) => requestBody)

      await frisby
        .create(this.test.title)
        .head('http://example.test/', {
          qs: { name: 'sally' },
        })
        .expectStatus(204)
        .run()

      scope.done()
    })

    it('options()', async function() {
      const scope = nock('http://example.test')
        .options('/')
        .query({ name: 'sally' })
        .reply(204, (uri, requestBody) => requestBody)

      await frisby
        .create(this.test.title)
        .options('http://example.test/', {
          qs: { name: 'sally' },
        })
        .expectStatus(204)
        .run()

      scope.done()
    })
  })

  it('util.inspect should not have side effects', function() {
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

  describe('exclusive tests', function() {
    let sandbox, globalMock, describeMock
    beforeEach(function() {
      sandbox = sinon.sandbox.create()
      globalMock = sandbox.mock(global, 'describe')
      globalMock.expects('describe').never()
      describeMock = sandbox.mock(global.describe)
      describeMock.expects('only').once()
    })
    afterEach(function() {
      globalMock.verify()
      describeMock.verify()
    })
    afterEach(function() {
      sandbox.restore()
    })

    it('should register exclusive tests', function() {
      frisby
        .create(this.test.title)
        .get('http://example.test/test')
        .only()
        .toss()
    })
  })

  describe('header checks should ignore case for strings', function() {
    it('expectHeader should pass when the header case is mismatched', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'The payload', { myHEADER: 'myvalue' })

      await frisby
        .create(this.test.title)
        .post('http://example.test/')
        .expectStatus(201)
        .expectHeader('MYheader', 'myvalue')
        .run()

      scope.done()
    })

    it('expectHeader should pass when the content case is mismatched', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'The payload', { myheader: 'myVALUE' })

      await frisby
        .create(this.test.title)
        .post('http://example.test/')
        .expectStatus(201)
        .expectHeader('myheader', 'MYvalue')
        .run()

      scope.done()
    })

    it('expectNoHeader should fail (detect the header) when the header case is mismatched', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'The payload', { myHEADER: 'myVALUE' })

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectStatus(201)
          .expectNoHeader('MYheader')
          .run()
      ).to.be.rejectedWith(
        AssertionError,
        "expected { myheader: 'myVALUE' } to not have property 'myheader'"
      )

      scope.done()
    })

    it('expectHeaderContains should pass when the header case is mismatched', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'The payload', { myHEADER: 'myvalue' })

      await frisby
        .create(this.test.title)
        .post('http://example.test/')
        .expectStatus(201)
        .expectHeaderContains('MYheader', 'myvalue')
        .run()

      scope.done()
    })

    it('expectHeaderContains should pass when the content case is mismatched', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'The payload', { myheader: 'myVALUE' })

      await frisby
        .create(this.test.title)
        .post('http://example.test/')
        .expectStatus(201)
        .expectHeaderContains('myheader', 'MYvalue')
        .run()

      scope.done()
    })

    it('expectHeader with regex should fail when the content case is mismatched', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'The payload', { myHEADER: 'myVALUE' })

      await expect(
        frisby
          .create(this.test.title)
          .post('http://example.test/')
          .expectStatus(201)
          .expectHeader('MYheader', /MYvalue/)
          .run()
      ).to.be.rejectedWith(
        AssertionError,
        "expected an element of [ 'myVALUE' ] to match /MYvalue/"
      )

      scope.done()
    })

    it('expectHeader with regex should pass when the case is mismatched and the regex is case-insensitive', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'The payload', { myHEADER: 'myVALUE' })

      await frisby
        .create(this.test.title)
        .post('http://example.test/')
        .expectStatus(201)
        .expectHeader('MYheader', /MYvalue/i)
        .run()

      scope.done()
    })

    it('expectHeader with regex should pass when the case is matched', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(201, 'The payload', { myHEADER: 'myVALUE' })

      await frisby
        .create(this.test.title)
        .post('http://example.test/')
        .expectStatus(201)
        .expectHeader('MYheader', /myVALUE/)
        .run()

      scope.done()
    })
  })
})

describe('request headers', function() {
  it('addHeaders should add the normalized header to the outgoing request', async function() {
    let headers
    const scope = nock('http://example.test')
      .get('/')
      .reply(200, function(uri, requestBody) {
        headers = this.req.headers
        return fixtures.arrayOfObjects
      })

    await frisby
      .create(this.test.title)
      .get('http://example.test/')
      .addHeaders({ Test: 'Two' })
      .expectStatus(200)
      .run()

    expect(headers).to.not.have.property('Test')
    expect(headers).to.have.property('test')
    expect(headers.test).to.equal('Two')
    scope.done()
  })

  context('when configured with { json: true }', function() {
    it('applies the expected json header', async function() {
      let headers
      const scope = nock('http://example.test')
        .post('/')
        .reply(200, function(uri, requestBody) {
          headers = this.req.headers
          return fixtures.arrayOfObjects
        })

      await frisby
        .create(this.test.title)
        .config({ json: true })
        .post('http://example.test/', {})
        .expectStatus(200)
        .run()

      expect(headers['content-type']).to.equal('application/json')
      scope.done()
    })

    context('when configured after _request() is invoked', function() {
      it('still applies the expected json header', async function() {
        let headers
        const scope = nock('http://example.test')
          .post('/')
          .reply(200, function(uri, requestBody) {
            headers = this.req.headers
            return fixtures.arrayOfObjects
          })

        await frisby
          .create(this.test.title)
          .post('http://example.test', {})
          .config({ json: true })
          .expectStatus(200)
          .run()

        expect(headers['content-type']).to.equal('application/json')
        scope.done()
      })
    })
  })

  context('when passing params to _request', function() {
    it('should allow for passing raw request body and preserve json:true option', async function() {
      const scope = nock('http://example.test')
        .post('/')
        .reply(200, { foo: 'bar' })

      const test = frisby
        .create(this.test.title)
        .post('http://example.test/', {}, { json: true })
        .expectStatus(200)
        .expectJSON({ foo: 'bar' })
        .expectHeader('Content-Type', 'application/json')

      await test.run()

      expect(test._outgoing.headers['content-type']).to.equal(
        'application/json'
      )
      expect(test._outgoing.body).to.deep.equal({})
      scope.done()
    })

    it('preserves a custom json header with json:true option', async function() {
      const scope = nock('http://example.test')
        .post('/json')
        .reply(200, { foo: 'bar' })

      const customContentType =
        'application/json; profile=http://example.test/schema/books#'

      const test = frisby
        .create(this.test.title)
        .post('http://example.test/json', {}, { json: true })
        .addHeader('Content-Type', customContentType)
        .expectStatus(200)
        .expectJSON({ foo: 'bar' })
        .expectHeader('Content-Type', 'application/json')

      await test.run()

      expect(test._outgoing.headers['content-type']).to.equal(customContentType)
      expect(test._outgoing.body).to.deep.equal({})
      scope.done()
    })
  })

  context('when passing headers by config()', function() {
    it('config should add the normalized headers to the outgoing request', async function() {
      let headers
      const scope = nock('http://example.test')
        .get('/')
        .reply(200, function(uri, requestBody) {
          headers = this.req.headers
          return fixtures.arrayOfObjects
        })

      await frisby
        .create(this.test.title)
        .get('http://example.test/')
        .config({
          request: {
            headers: { Test: 'Two' },
          },
        })
        .expectStatus(200)
        .run()

      expect(headers).to.not.have.property('Test')
      expect(headers).to.have.property('test')
      expect(headers.test).to.equal('Two')
      scope.done()
    })
  })

  context('when passing headers by config() and addHeader', function() {
    it('should send all configured headers', async function() {
      let headers
      const scope = nock('http://example.test')
        .get('/')
        .reply(200, function(uri, requestBody) {
          headers = this.req.headers
          return fixtures.arrayOfObjects
        })

      await frisby
        .create(this.test.title)
        .get('http://example.test/')
        .config({
          request: {
            headers: { one: '1' },
          },
        })
        .addHeader('two', '2')
        .expectStatus(200)
        .run()

      expect(headers).to.have.property('one')
      expect(headers.one).to.equal('1')
      expect(headers).to.have.property('two')
      expect(headers.two).to.equal('2')
      scope.done()
    })

    it('addHeader should override config()', async function() {
      let headers
      const scope = nock('http://example.test')
        .get('/')
        .reply(200, function(uri, requestBody) {
          headers = this.req.headers
          return fixtures.arrayOfObjects
        })

      await frisby
        .create(this.test.title)
        .get('http://example.test/')
        .config({
          request: {
            headers: { three: '3' },
          },
        })
        .addHeader('three', '2+1')
        .expectStatus(200)
        .run()

      expect(headers).to.have.property('three')
      expect(headers.three).to.equal('2+1')
      scope.done()
    })
  })

  context('when passing headers by params and addHeader', function() {
    it('should send all configured headers', async function() {
      let headers
      const scope = nock('http://example.test')
        .get('/')
        .reply(200, function(uri, requestBody) {
          headers = this.req.headers
          return fixtures.arrayOfObjects
        })

      await frisby
        .create(this.test.title)
        .get('http://example.test/', {
          headers: { one: '1' },
        })
        .addHeader('two', '2')
        .expectStatus(200)
        .run()

      expect(headers).to.have.property('one')
      expect(headers.one).to.equal('1')
      expect(headers).to.have.property('two')
      expect(headers.two).to.equal('2')
      scope.done()
    })

    it.skip('addHeader should override params', async function() {
      //Issue #106
      let headers
      const scope = nock('http://example.test')
        .get('/')
        .reply(200, function(uri, requestBody) {
          headers = this.req.headers
          return fixtures.arrayOfObjects
        })

      await frisby
        .create(this.test.title)
        .get('http://example.test/', {
          headers: { three: '3' },
        })
        .addHeader('three', '2+1')
        .expectStatus(200)
        .run()

      expect(headers).to.have.property('three')
      expect(headers.three).to.equal('2+1')
      scope.done()
    })
  })

  context('when removing headers via removeHeader', function() {
    it('should not send a removed header when it was added via addHeader', async function() {
      let headers
      const scope = nock('http://example.test')
        .get('/')
        .reply(200, function(uri, requestBody) {
          headers = this.req.headers
          return fixtures.arrayOfObjects
        })

      await frisby
        .create(this.test.title)
        .get('http://example.test/')
        .addHeaders({ One: '1', Two: '2' })
        .removeHeader('One')
        .expectStatus(200)
        .run()

      expect(headers).to.not.have.property('one')
      expect(headers).to.have.property('two')
      expect(headers.two).to.equal('2')
      scope.done()
    })

    it.skip('should not send a removed header when it was added via params', async function() {
      //Issue #122
      let headers
      const scope = nock('http://example.test')
        .get('/')
        .reply(200, function(uri, requestBody) {
          headers = this.req.headers
          return fixtures.arrayOfObjects
        })

      await frisby
        .create(this.test.title)
        .get('http://example.test/', {
          headers: { One: '1', Two: '2' },
        })
        .removeHeader('One')
        .expectStatus(200)
        .run()

      expect(headers).to.not.have.property('one')
      expect(headers).to.have.property('two')
      expect(headers.two).to.equal('2')
      scope.done()
    })

    it('should not send a removed header when it was added via config()', async function() {
      let headers
      const scope = nock('http://example.test')
        .get('/')
        .reply(200, function(uri, requestBody) {
          headers = this.req.headers
          return fixtures.arrayOfObjects
        })

      await frisby
        .create(this.test.title)
        .get('http://example.test/')
        .config({
          request: {
            headers: { One: '1', Two: '2' },
          },
        })
        .removeHeader('One')
        .expectStatus(200)
        .run()

      expect(headers).to.not.have.property('one')
      expect(headers).to.have.property('two')
      expect(headers.two).to.equal('2')
      scope.done()
    })

    it('should not send a removed header, regardless of casing', async function() {
      let headers
      const scope = nock('http://example.test')
        .get('/')
        .reply(200, function(uri, requestBody) {
          headers = this.req.headers
          return fixtures.arrayOfObjects
        })

      await frisby
        .create(this.test.title)
        .get('http://example.test/')
        .addHeaders({ One: '1', Two: '2' })
        .removeHeader('ONE')
        .expectStatus(200)
        .run()

      expect(headers).to.not.have.property('one')
      expect(headers).to.have.property('two')
      expect(headers.two).to.equal('2')
      scope.done()
    })

    it('should not error when removing a non-existant header', async function() {
      let headers
      const scope = nock('http://example.test')
        .get('/')
        .reply(200, function(uri, requestBody) {
          headers = this.req.headers
          return fixtures.arrayOfObjects
        })

      await frisby
        .create(this.test.title)
        .get('http://example.test/')
        .addHeaders({ One: '1', Two: '2' })
        .removeHeader('Three')
        .expectStatus(200)
        .run()

      expect(headers).to.have.property('one')
      expect(headers).to.have.property('two')
      expect(headers.one).to.equal('1')
      expect(headers.two).to.equal('2')
      expect(headers).to.not.have.property('three')
      scope.done()
    })
  })
})

describe('Error Handling', function() {
  context('the exceptionHandler function', function() {
    it('should return false when not set and called with no function', function() {
      const thisFrisby = frisby
        .create(this.test.title)
        .get('http://example.test')

      expect(thisFrisby.exceptionHandler()).to.equal(false)
    })

    it('should return the currently assigned error handler function when called with no function', function() {
      const myExceptionHandler = () => {}

      const thisFrisby = frisby
        .create(this.test.title)
        .get('http://example.test')
        .exceptionHandler(myExceptionHandler)

      expect(thisFrisby.exceptionHandler()).to.equal(myExceptionHandler)
    })
  })
})
