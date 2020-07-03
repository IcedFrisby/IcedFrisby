'use strict'

const chai = require('chai')
const intercept = require('intercept-stdout')
const nock = require('nock')
const stripAnsi = require('strip-ansi')
const frisby = require('../lib/icedfrisby')
const { expect } = chai

//
// This spec tests and showcases the dev-friendy output features of IcedFrisby
//

describe('console output', function() {
  let stdout, unhook
  beforeEach(function() {
    stdout = ''
    unhook = intercept(txt => {
      stdout += txt
    })
  })
  afterEach(function() {
    unhook()
    unhook = undefined
  })

  it("should warn developers if there is a header with 'json' but the body type is not JSON", async function() {
    const scope = nock('http://example.test/')
      .post('/')
      .once()
      .reply(201)

    await frisby
      .create(this.test.title)
      .addHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Referer: 'http://frisbyjs.com',
      })
      .post('http://example.test/', {
        isSomeObj: true,
      })
      .expectStatus(201)
      .run()

    expect(stripAnsi(stdout)).to.equal(
      'WARNING - content-type is json but body type is not set\n'
    )
    scope.done()
  })

  it('should NOT warn developers that "there is a header with \'json\' but the body type is not JSON" because there is no body provided', async function() {
    const scope = nock('http://example.test')
      .post('/')
      .once()
      .reply(201, (uri, requestBody) => requestBody)

    await frisby
      .create(this.test.title)
      .post('http://example.test/')
      .expectStatus(201)
      .run()

    expect(stdout).to.equal('')
    scope.done()
  })

  describe('inspectOnFailure', function() {
    it.skip('TODO should provide the expected debug output on failure')
  })

  describe('Deprecated features', function() {
    it('should error when someone uses globalSetup', function() {
      expect(() => frisby.globalSetup({})).to.throw(
        Error,
        'globalSetup() has been removed.'
      )
    })

    it('should error when someone uses reset', function() {
      // Had been used to reset globalConfig.
      expect(() => frisby.create(this.test.title).reset()).to.throw(
        Error,
        "reset() has been removed from IcedFrisby v2.0+ - there's no more globalSetup(), use config() instead"
      )
    })
  })
})
