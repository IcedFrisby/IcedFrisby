# IcedFrisby

[![Greenkeeper badge](https://badges.greenkeeper.io/MarkHerhold/IcedFrisby.svg)](https://greenkeeper.io/)

[![Build Status](https://api.travis-ci.org/MarkHerhold/IcedFrisby.svg?branch=master)](https://travis-ci.org/MarkHerhold/IcedFrisby/)
[![Coverage Status](https://coveralls.io/repos/github/MarkHerhold/IcedFrisby/badge.svg)](https://coveralls.io/github/MarkHerhold/IcedFrisby)
[![Dependency Status](https://gemnasium.com/RobertHerhold/IcedFrisby.svg)](https://gemnasium.com/RobertHerhold/IcedFrisby)
[![npm](https://img.shields.io/npm/v/icedfrisby.svg)](http://www.npmjs.com/package/icedfrisby)


**IcedFrisby** is a Node.js npm module that makes testing API endpoints easy, fast and fun. Based on the original [Frisby](https://github.com/vlucas/frisby) project.

## :orange_book: API Documentation
The [**IcedFrisby** API Docs](https://github.com/RobertHerhold/IcedFrisby/blob/master/API.md) are located in [API.md](https://github.com/RobertHerhold/IcedFrisby/blob/master/API.md).

## Changelog
The [**IcedFrisby** Changelog](https://github.com/RobertHerhold/IcedFrisby/blob/master/CHANGELOG.md) is located in [CHANGELOG.md](https://github.com/RobertHerhold/IcedFrisby/blob/master/CHANGELOG.md).

## What makes IcedFrisby different?
* Uses [Mocha](https://github.com/mochajs/mocha) as the driver instead of Jasmine
* Uses [Chai](https://github.com/chaijs/chai) for assertions
* Uses [Joi](https://github.com/hapijs/joi) for flexible and simple schema/type JSON validation
* expectJSON(...) is now strict. Undefined/null fields are not ignored and missing fields are considered errors
* Adds expectContainsJSON(...)! Test JSON responses without knowing every field.
* Uses [lodash](https://github.com/lodash/lodash) instead of underscore
* Returns a 599 (network timeout error) response if a request times out or is unavailable instead of a 500

## Installation

Install IcedFrisby and Mocha from NPM:

    npm install mocha icedfrisby --save-dev

**Note:** IcedFrisby is built and tested against the latest stable versions of Node.js (4, 5, and 6)

## Show me some code!

IcedFrisby tests start with `frisby.create()` with a description of the test followed by one of `get()`, `put()`, `post()`, `delete()`, or `head()`, and ending with `toss()` to generate the resulting Mocha test. There is a `expectStatus()` method built in to more easily test HTTP status codes. Any other Mocha `expect` tests should be done inside the `after()` or `afterJSON()` callback.

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

Any Mocha/Chai/whatever tests can be used inside the `after` and `afterJSON` callbacks to perform additional or custom tests on the response data.

## Running Tests

Run tests as you normally would with [Mocha](https://github.com/mochajs/mocha).

### Run it from the CLI

    cd your/project
    mocha tests/someTest.js --reporter nyan

---

## IcedFrisby Development

### Code Coverage
You can assess code coverage by running `istanbul cover _mocha ./spec/**/*_spec.js -R spec`

### Contributions
Contributions are awesome! If you have an idea or code that you want to contribute, feel free to submit a pull request and I will gladly review it. I am open to pretty much anything.

### Roadmap
1. Make output errors more useful. It can be hard to track down which assertion is causing what error.
1. Add a "stack trace" for paths to help discern why a path traversal failed
1. Support [chained tests/promises](https://github.com/vlucas/frisby/issues/223). Related: [#127](https://github.com/vlucas/frisby/issues/127), [#154](https://github.com/vlucas/frisby/issues/154), [#200](https://github.com/vlucas/frisby/issues/200)
1. custom assertion plugin support

## License
Licensed under the [MIT](http://opensource.org/licenses/MIT)/[BSD](http://opensource.org/licenses/BSD-3-Clause) license.
