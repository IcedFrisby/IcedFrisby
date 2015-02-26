# Mocha-Friendly Frisby

A node.js NPM module that makes testing API endpoints easy, fast and fun.

This fork is still a major work-in-progress and should be considered unstable.

## What makes this fork different?
* Uses Mocha as the driver instad of Jasmine
* Uses Chai for assertions
* Uses [Joi](https://github.com/hapijs/joi) for flexible and simple schema/type JSON validation
* Uses [lodash](https://github.com/lodash/lodash) instead of underscore
* Returns a 599 (network teimout error) response if a request times out or is unavailable instead of a 500

## Installation

Install Frisby from NPM:

    npm install frisby --save-dev

## Creating Tests

Frisby tests start with `frisby.create` with a description of the test followed by one of `get`, `post`, `put`, `delete`, or `head`, and ending with `run` to generate the resulting Mocha spec test. There is a `expectStatus` method built in to more easily test HTTP status codes. Any other Mocha `expect` tests should be done inside the `after` callback.

Each set of unique sequences or API endpoint tests should be started with new `frisby.toss` method calls instead of trying to chain multiple HTTP requests together.

```javascript

var frisby = require('frisby');
var Joi = require('joi');

var URL = 'http://localhost:3000/';
var URL_AUTH = 'http://username:password@localhost:3000/';

frisby.globalSetup({ // globalSetup is for ALL requests
  request: {
    headers: { 'X-Auth-Token': 'fa8426a0-8eaf-4d22-8e13-7c1b16a9370c' }
  }
});

frisby.create('GET user johndoe')
  .get(URL + '/users/3.json')
  .expectStatus(200)
  .expectJSONTypes({
    id: Joi.number(),
    username: Joi.string(),
    is_admin: Joi.boolean()
  })
  .expectJSON({
    id: 3,
    username: 'johndoe',
    is_admin: false
  })
  // 'afterJSON' automatically parses response body as JSON and passes it as an argument
  .afterJSON(function(user) {
  	// You can use any normal assertions here
  	expect(1+1).toEqual(2);

  	// Use data from previous result in next test
    frisby.create('Update user')
      .put(URL_AUTH + '/users/' + user.id + '.json', {tags: ['mocha', 'bdd']})
      .expectStatus(200)
    .toss();
  })
.toss();

```

Any Mocha tests can be used inside the `after` and `afterJSON` callbacks to perform additional or custom tests on the response data.

## Running Tests

This fork of Frisby is built on top of the Mocha BDD spec framework.

### File naming conventions

### Install mocha

    npm install -g mocah

### Run it from the CLI

    cd your/project
    mocha .

## License
Licensed under the [MIT](http://opensource.org/licenses/MIT)/[BSD](http://opensource.org/licenses/BSD-3-Clause) license.
