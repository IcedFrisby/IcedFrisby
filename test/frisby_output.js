'use strict'

const chai = require('chai')
const intercept = require("intercept-stdout")
const nock = require('nock')
const frisby = require('../lib/icedfrisby')
const sinon = require('sinon')

//
// This spec tests and showcases the dev-friendy output features of IcedFrisby
//

describe('console output', function() {
  const warning = '\u001b[33m\u001b[1mWARNING - content-type is json but body type is not set\u001b[22m\u001b[39m\n'

  it('should warn developers if there is a header with \'json\' but the body type is not JSON', function() {
    // Mock API
    nock('http://mock-request/', {allowUnmocked: true})
      .post('/test-object')
      .once()
      .reply(201)

    let unhook
    let stdout = ''

    frisby.create(this.test.title)
      .addHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Referer: 'http://frisbyjs.com',
      })
      .post('http://mock-request/test-object', {
        isSomeObj: true
      })
      .expectStatus(201)
      .before(() => {
        unhook = intercept(txt => {
          stdout += txt
        })
      })
      .after(() => {
        unhook()
        chai.assert.equal(warning, stdout, 'expect stdout to have a specific warning')
      })
      .toss()
  })

  it('should NOT warn developers that "there is a header with \'json\' but the body type is not JSON" because there is no body provided', function() {
    // Mock API
    nock('http://mock-request/', {allowUnmocked: true})
      .post('/test-object')
      .once()
      .reply(201, function(uri, requestBody) {
        return requestBody
      })

    let stdout = ""
    const unhook = intercept(function(txt) {
      stdout += txt
    })

    frisby.create(this.test.title)
      .post('http://mock-request/test-object')
      .expectStatus(201)
      .toss()

    unhook()
    chai.assert.equal("", stdout, 'expect stdout to be empty')
  })

  describe('inspectOnFailure', function () {
    it.skip('TODO should provide the expected debug output on failure')
  })

  describe('Deprecated features', function(){
    it('should error when someone uses globalConfig', function(){
      const spy = sinon.spy()

      try {
        frisby.globalSetup({})
      } catch(err){
        expect(err.message).to.equal('globalSetup() has been removed.')
        spy()
      }
      expect(spy.calledOnce).to.equal(true)
    })

    it('should error when someone uses reset', function(){ //Was used to reset globalConfig
      const spy = sinon.spy()

      try {
        frisby.create(this.test.title)
          .reset()
      } catch(err){
        expect(err.message).to.equal('reset() has been removed from IcedFrisby v2.0+ - there\'s no more globalSetup(), use config() instead')
        spy()
      }
      expect(spy.calledOnce).to.equal(true)
    })
  })
})
