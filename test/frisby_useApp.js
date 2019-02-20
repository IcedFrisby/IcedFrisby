'use strict'

const fs = require('fs')
const https = require('https')
const path = require('path')
const frisby = require('./../lib/icedfrisby')
const express = require('express')
const { expect } = require('chai')

// The following tests were adapted from:
// https://github.com/visionmedia/supertest/blob/master/test/supertest.js

describe('IcedFrisby useApp(app)', function() {
  it('should start the http server on an ephemeral port', function() {
    const app = express()

    app.get('/', function(req, res) {
      res.send('^.^')
    })

    frisby
      .create(this.test.title)
      .useApp(app)
      .get('/')
      .expectStatus(200)
      .expectBodyContains('^.^')
      .toss()
  })

  it('should work with an active http server', function() {
    const app = express()

    app.get('/', (req, res) => {
      res.send('^.^')
    })

    const server = app.listen(4000, () => {
      frisby
        .create(this.test.title)
        .useApp(app)
        .get('/')
        .expectStatus(200)
        .expectBodyContains('^.^')
        .after(() => server.close())
        .toss()
    })
  })

  it('should start the https server on an ephemeral port', function() {
    // disable rejecting self signed certs for testing purposes
    // Attn Everyone: DO NOT USE THIS IN PRODUCTION
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    const app = express()

    app.get('/', function(req, res) {
      res.send('^.^')
    })

    const fixtures = path.join(__dirname, '../', 'test', 'fixtures')
    const server = https.createServer(
      {
        key: fs.readFileSync(path.join(fixtures, 'test_key.pem')),
        cert: fs.readFileSync(path.join(fixtures, 'test_cert.pem')),
      },
      app
    )

    frisby
      .create(this.test.title)
      .useApp(server)
      .get('/')
      .expectStatus(200)
      .expectBodyContains('^.^')
      .toss()
  })

  it('should work with an active https server', function() {
    // disable rejecting self signed certs for testing purposes
    // Attn Everyone: DO NOT USE THIS IN PRODUCTION
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    const app = express()

    app.get('/', function(req, res) {
      res.send('^.^')
    })

    const fixtures = path.join(__dirname, '../', 'test', 'fixtures')
    const server = https
      .createServer(
        {
          key: fs.readFileSync(path.join(fixtures, 'test_key.pem')),
          cert: fs.readFileSync(path.join(fixtures, 'test_cert.pem')),
        },
        app
      )
      .listen()

    frisby
      .create(this.test.title)
      .useApp(server)
      .get('/')
      .expectStatus(200)
      .expectBodyContains('^.^')
      .toss()
  })

  it('should work with an app with a base path component', function() {
    const app = express()

    app.get('/api/foo', function(req, res) {
      res.send('bar')
    })

    frisby
      .create(this.test.title)
      .useApp(app, '/api')
      .get('/foo')
      .expectStatus(200)
      .expectBodyContains('bar')
      .after(function(err, res, body) {
        expect(err).to.not.exist
      })
      .toss()
  })

  it('should throw an exception if app is not defined', function() {
    const self = this

    const fn = function() {
      frisby
        .create(self.test.title)
        .useApp(undefined)
        .toss()
    }

    expect(fn).to.throw('No app provided')
  })
})
