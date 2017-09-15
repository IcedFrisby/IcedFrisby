'use strict'

var fs = require('fs')
var https = require('https')
var path = require('path')
var frisby = require('./../lib/icedfrisby')
var express = require('express')

var chai = require('chai')
var expect = chai.expect

// The following tests were adapted from:
// https://github.com/visionmedia/supertest/blob/master/test/supertest.js

describe('IcedFrisby useApp(app)', function() {
  it('should start the http server on an ephemeral port', function() {
    var app = express()

    app.get('/', function(req, res) {
      res.send('^.^')
    })

    frisby.create(this.test.title)
      .useApp(app)
      .get('/')
      .expectStatus(200)
      .expectBodyContains('^.^')
      .after(function(err, res, body) {
        expect(err).to.not.exist
      })
      .toss()
  })

  it('should work with an active http server', function() {
    var app = express()

    app.get('/', function(req, res) {
      res.send('^.^')
    })

    app.listen(4000, function() {
      frisby.create(this.test.title)
        .useApp(app)
        .get('/')
        .expectStatus(200)
        .expectBodyContains('^.^')
        .toss()
    })
  })

  it('should start the https server on an ephemeral port', function() {
    // disable rejecting self signed certs for testing purposes
    // Attn Everyone: DO NOT USE THIS IN PRODUCTION
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

    var app = express()

    app.get('/', function(req, res) {
      res.send('^.^')
    })

    var fixtures = path.join(__dirname, '../', 'test', 'fixtures')
    var server = https.createServer({
      key: fs.readFileSync(path.join(fixtures, 'test_key.pem')),
      cert: fs.readFileSync(path.join(fixtures, 'test_cert.pem'))
    }, app)

    frisby.create(this.test.title)
      .useApp(server)
      .get('/')
      .expectStatus(200)
      .expectBodyContains('^.^')
      .toss()
  })

  it('should work with an active https server', function() {
    // disable rejecting self signed certs for testing purposes
    // Attn Everyone: DO NOT USE THIS IN PRODUCTION
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

    var app = express()

    app.get('/', function(req, res) {
      res.send('^.^')
    })

    var fixtures = path.join(__dirname, '../', 'test', 'fixtures')
    var server = https.createServer({
      key: fs.readFileSync(path.join(fixtures, 'test_key.pem')),
      cert: fs.readFileSync(path.join(fixtures, 'test_cert.pem'))
    }, app).listen()

    frisby.create(this.test.title)
      .useApp(server)
      .get('/')
      .expectStatus(200)
      .expectBodyContains('^.^')
      .toss()
  })

  it('should throw an exception if app is not defined', function() {
    var self = this

    var fn = function() {
      frisby.create(self.test.title)
        .useApp(undefined)
        .toss()
    }

    expect(fn).to.throw('No app provided')
  })
})
