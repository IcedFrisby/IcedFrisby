# IcedFrisby

[![Build Status](https://travis-ci.org/RobertHerhold/IcedFrisby.svg)](https://travis-ci.org/RobertHerhold/IcedFrisby)
[![Coverage Status](https://coveralls.io/repos/RobertHerhold/IcedFrisby/badge.svg)](https://coveralls.io/r/RobertHerhold/IcedFrisby)
[![Dependency Status](https://gemnasium.com/RobertHerhold/IcedFrisby.svg)](https://gemnasium.com/RobertHerhold/IcedFrisby)

IcedFrisby is a node.js NPM module that makes testing API endpoints easy, fast and fun. Based on the original [Frisby](https://github.com/vlucas/frisby) project.

This is still a major work-in-progress and should be considered unstable.

## What makes IcedFrisby different?
* Uses [Mocha](https://github.com/mochajs/mocha) as the driver instead of Jasmine
* Uses [Chai](https://github.com/chaijs/chai) for assertions
* Uses [Joi](https://github.com/hapijs/joi) for flexible and simple schema/type JSON validation
* expectJSON(...) is now strict. Undefined/null fields are not ignored and missing fields are considered errors
* Uses [lodash](https://github.com/lodash/lodash) instead of underscore
* Returns a 599 (network timeout error) response if a request times out or is unavailable instead of a 500

## Installation

Install IcedFrisby from NPM:

    npm install icedfrisby --save-dev

## Creating Tests

IcedFrisby tests start with `frisby.create` with a description of the test followed by one of `get`, `post`, `put`, `delete`, or `head`, and ending with `run` to generate the resulting Mocha spec test. There is a `expectStatus` method built in to more easily test HTTP status codes. Any other Mocha `expect` tests should be done inside the `after` callback.

Each set of unique sequences or API endpoint tests should be started with new `frisby.toss` method calls instead of trying to chain multiple HTTP requests together.

```javascript

var frisby = require('icedfrisby');  // get IcedFrisby with `npm install icedfrisby`
var Joi = require('joi'); // get Joi with `npm install joi`

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
  .expectJSONTypes({
    id: Joi.number(),
    username: Joi.string(),
    is_admin: Joi.boolean()
  })
  // 'afterJSON' automatically parses response body as JSON and passes it as an argument
  .afterJSON(function(user) {
  	// You can use any normal assertions here
  	expect(1+1).to.equal(2);

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

Run tests as you normally would with Mocha.

### Install Mocha

    npm install -g mocha

### Run it from the CLI

    cd your/project
    mocha tests/someTest.js --reporter nyan

## Development

### Code Coverage
You can assess code coverage by running `istanbul cover _mocha ./spec/**/*_spec.js -R spec`

### TODO
1. Add a .containsJSON() method
1. Make output errors more useful. It can be hard to track down which assertion is causing what error.
1. More test coverage!

## License
Licensed under the [MIT](http://opensource.org/licenses/MIT)/[BSD](http://opensource.org/licenses/BSD-3-Clause) license.
