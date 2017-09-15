'use strict'

var frisby = require('./../lib/icedfrisby')
var app = require('./app_integration_express/expressApp')

describe('Example Express app integration', function() {
  frisby.create('should start the app on an ephemeral port and request')
    .useApp(app)
    .get('/')
    .expectStatus(200)
    .expectBodyContains('Hello World!')
    .toss()

  frisby.create('should start the app on an ephemeral port and request')
    .useApp(app, '/a/path')
    .get('/not-found')
    .expectStatus(404)
    .toss()
})
