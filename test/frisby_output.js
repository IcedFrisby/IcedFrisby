'use strict'

const chai = require('chai')
const intercept = require("intercept-stdout")
const nock = require('nock')
const frisby = require('../lib/icedfrisby')

//
// This spec tests and showcases the dev-friendy output features of IcedFrisby
//

// Test global setup
var defaultGlobalSetup = frisby.globalSetup()
var mockGlobalSetup = function() {
  frisby.globalSetup({
    timeout: 3000,
    request: {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Referer': 'http://frisbyjs.com'
      }
    }
  })
}
var restoreGlobalSetup = function() {
  frisby.globalSetup(defaultGlobalSetup)
}

describe('console output', function() {
  var warning = '\u001b[33m\u001b[1mWARNING - content-type is json but body type is not set\u001b[22m\u001b[39m\n'

  afterEach(restoreGlobalSetup)

  it('should warn developers if there is a header with \'json\' but the body type is not JSON', function() {
        // Mock API
    nock('http://mock-request/', {
      allowUnmocked: true
    })
            .post('/test-object')
            .once()
            .reply(201)

    mockGlobalSetup()

    var stdout = ""
    var unhook = intercept(function(txt) {
      stdout += txt
    })

    frisby.create(this.test.title)
            .post('http://mock-request/test-object', {
              isSomeObj: true
            })
            .expectStatus(201)
            .toss()

    unhook()
    chai.assert.equal(warning, stdout, 'expect stdout to have a specific warning')
  })

  it('should NOT warn developers that "there is a header with \'json\' but the body type is not JSON" because there is no body provided', function() {
        // Mock API
    nock('http://mock-request/', {
      allowUnmocked: true
    })
            .post('/test-object')
            .once()
            .reply(201, function(uri, requestBody) {
              return requestBody
            })

    var stdout = ""
    var unhook = intercept(function(txt) {
      stdout += txt
    })

    frisby.create(this.test.title)
            .post('http://mock-request/test-object')
            .expectStatus(201)
            .toss()

    unhook()
    chai.assert.equal("", stdout, 'expect stdout to be empty')
  })
})
