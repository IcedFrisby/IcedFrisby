'use strict'

const frisby = require('./../lib/icedfrisby')
const app = require('./app_integration_express/expressApp')

describe('Example Express app integration', function() {
  it('should start the app on an ephemeral port and request', function() {
    frisby
      .create(this.test.title)
      .useApp(app)
      .get('/')
      .expectStatus(200)
      .expectBodyContains('Hello World!')
      .toss()
  })

  it('should start the app on an ephemeral port and request', function() {
    frisby
      .create(this.test.title)
      .useApp(app, '/a/path')
      .get('/not-found')
      .expectStatus(404)
      .toss()
  })
})
