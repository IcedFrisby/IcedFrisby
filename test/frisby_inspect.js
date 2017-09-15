'use strict'

var frisby = require('../lib/icedfrisby')
var expect = require('chai').expect
var nock = require('nock')

describe('IcedFrisby inspect methods', function() {

  it('should perform no action if null is provided to the inspect() callback', function() {
    var inspectNock = nock('http://inspect-null.httpbin.org')
      .get('/get')
      .once()
      .reply(200, {
        "args": {},
        "headers": {
          "Host": "httpbin.org",
        },
        "origin": "127.0.0.1",
        "url": "http://inspect.httpbin.org/get"
      })

    frisby.create(this.test.title)
      .get('http://inspect-null.httpbin.org/get', {json: true})
      .inspect(null)
      .after(function() {
        // check that the mock was consumed
        inspectNock.done()
      })
      .toss()
  })

  it('should allow a call to inspect the request and response', function() {
    var inspectNock = nock('http://inspect.httpbin.org')
      .get('/get')
      .reply(200, {
        "args": {},
        "headers": {
          "Host": "httpbin.org",
        },
        "origin": "127.0.0.1",
        "url": "http://inspect.httpbin.org/get"
      })

    frisby.create(this.test.title)
      .get('http://inspect.httpbin.org/get', {json: true})
      .inspect(function(err, req, res, body, headers) {
        expect(err).to.equal(null)
        expect(req).to.be.an('object')
        expect(res).to.be.an('object')
        expect(body).to.be.an('object')
        expect(headers).to.be.an('object')

        // check that the mock was consumed
        inspectNock.done()
      })
      .toss()
  })

  it('- inspectRequest should work', function() {
    var inspectNock = nock('http://inspectRequest.httpbin.org')
      .get('/get')
      .reply(200, {
        "args": {},
        "headers": {
          "Host": "httpbin.org",
        },
        "origin": "127.0.0.1",
        "url": "http://inspect.httpbin.org/get"
      })

    frisby.create(this.test.title)
      .get('http://inspectRequest.httpbin.org/get', {json: true})
      .inspectRequest('inspectRequest')
      .after(function() {
        // check that the mock was consumed
        inspectNock.done()
      })
      .toss()
  })

  it('- inspectResponse should work', function() {
    var inspectNock = nock('http://inspectResponse.httpbin.org')
      .get('/get')
      .reply(200, {
        "args": {},
        "headers": {
          "Host": "httpbin.org",
        },
        "origin": "127.0.0.1",
        "url": "http://inspect.httpbin.org/get"
      })

    frisby.create(this.test.title)
      .get('http://inspectResponse.httpbin.org/get', {json: true})
      .inspectResponse('inspectResponse')
      .after(function() {
        // check that the mock was consumed
        inspectNock.done()
      })
      .toss()
  })

  it('- inspectHeaders should work', function() {
    var inspectNock = nock('http://inspectHeaders.httpbin.org')
      .get('/get')
      .reply(200, {
        "args": {},
        "headers": {
          "Host": "httpbin.org",
        },
        "origin": "127.0.0.1",
        "url": "http://inspect.httpbin.org/get"
      })

    frisby.create(this.test.title)
      .get('http://inspectHeaders.httpbin.org/get', {json: true})
      .inspectHeaders('inspectHeaders')
      .after(function() {
        // check that the mock was consumed
        inspectNock.done()
      })
      .toss()
  })

  it('- inspectBody should work', function() {
    var inspectNock = nock('http://inspectBody.httpbin.org')
      .get('/get')
      .reply(200, {
        "args": {},
        "headers": {
          "Host": "httpbin.org",
        },
        "origin": "127.0.0.1",
        "url": "http://inspect.httpbin.org/get"
      })

    frisby.create(this.test.title)
      .get('http://inspectBody.httpbin.org/get', {json: true})
      .inspectBody('inspectBody')
      .after(function() {
        // check that the mock was consumed
        inspectNock.done()
      })
      .toss()
  })

  it('- inspectJSON should work', function() {
    var inspectNock = nock('http://inspectJSON.httpbin.org')
      .get('/get')
      .reply(200, {
        "args": {},
        "headers": {
          "Host": "httpbin.org",
        },
        "origin": "127.0.0.1",
        "url": "http://inspect.httpbin.org/get"
      })

    frisby.create(this.test.title)
      .get('http://inspectJSON.httpbin.org/get', {json: true})
      .inspectJSON('inspectJSON')
      .after(function() {
        // check that the mock was consumed
        inspectNock.done()
      })
      .toss()
  })

  it('- inspectStatus should work', function() {
    var inspectNock = nock('http://inspectStatus.httpbin.org')
      .get('/get')
      .reply(200, {
        "args": {},
        "headers": {
          "Host": "httpbin.org",
        },
        "origin": "127.0.0.1",
        "url": "http://inspect.httpbin.org/get"
      })

    frisby.create(this.test.title)
      .get('http://inspectStatus.httpbin.org/get', {json: true})
      .inspectStatus('inspectStatus')
      .after(function() {
        // check that the mock was consumed
        inspectNock.done()
      })
      .toss()
  })
})
