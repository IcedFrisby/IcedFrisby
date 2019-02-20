'use strict'

const expect = require('chai').expect
const nock = require('nock')
const sinon = require('sinon')
const frisby = require('../lib/icedfrisby')
const fixtures = require('./fixtures/repetition_fixture.json')

describe('IcedFrisby inspect methods', function() {
  let scope
  beforeEach(function() {
    scope = nock('http://example.test')
      .get('/')
      .reply(200, fixtures.singleObject)
  })
  afterEach(function() {
    scope.done()
  })

  it('should perform no action if null is provided to the inspect() callback', async function() {
    await frisby
      .create(this.test.title)
      .get('http://example.test/', { json: true })
      .inspect(null)
      .run()
  })

  it('should allow a call to inspect the request and response', async function() {
    const inspectInvoked = sinon.spy()

    await frisby
      .create(this.test.title)
      .get('http://example.test/', { json: true })
      .inspect((err, req, res, body, headers) => {
        expect(err).to.equal(null)
        expect(req).to.be.an('object')
        expect(res).to.be.an('object')
        expect(body).to.be.an('object')
        expect(headers).to.be.an('object')
        inspectInvoked()
      })
      .run()

    expect(inspectInvoked.calledOnce).to.be.true
  })

  it('inspectRequest should work', async function() {
    await frisby
      .create(this.test.title)
      .get('http://example.test/', { json: true })
      .inspectRequest('inspectRequest')
      .run()
  })

  it('inspectRequest should work when passed no message', async function() {
    await frisby
      .create(this.test.title)
      .get('http://example.test/', { json: true })
      .inspectRequest()
      .run()
  })

  it('inspectResponse should work', async function() {
    await frisby
      .create(this.test.title)
      .get('http://example.test/', { json: true })
      .inspectResponse('inspectResponse')
      .run()
  })

  it('inspectResponse should work when passed no message', async function() {
    await frisby
      .create(this.test.title)
      .get('http://example.test/', { json: true })
      .inspectResponse()
      .run()
  })

  it('inspectHeaders should work', async function() {
    await frisby
      .create(this.test.title)
      .get('http://example.test/', { json: true })
      .inspectHeaders('inspectHeaders')
      .run()
  })

  it('inspectHeaders should work when passed no message', async function() {
    await frisby
      .create(this.test.title)
      .get('http://example.test/', { json: true })
      .inspectHeaders()
      .run()
  })

  it('inspectBody should work', async function() {
    await frisby
      .create(this.test.title)
      .get('http://example.test/', { json: true })
      .inspectBody('inspectBody')
      .run()
  })

  it('inspectBody should work when passed no message', async function() {
    await frisby
      .create(this.test.title)
      .get('http://example.test/', { json: true })
      .inspectBody()
      .run()
  })

  it('inspectJSON should work', async function() {
    await frisby
      .create(this.test.title)
      .get('http://example.test/', { json: true })
      .inspectJSON('inspectJSON')
      .run()
  })

  it('inspectJSON should work when passed no message', async function() {
    await frisby
      .create(this.test.title)
      .get('http://example.test/', { json: true })
      .inspectJSON()
      .run()
  })

  it('inspectStatus should work', async function() {
    await frisby
      .create(this.test.title)
      .get('http://example.test/', { json: true })
      .inspectStatus('inspectStatus')
      .run()
  })

  it('inspectStatus should work when passed no message', async function() {
    await frisby
      .create(this.test.title)
      .get('http://example.test/', { json: true })
      .inspectStatus()
      .run()
  })
})
