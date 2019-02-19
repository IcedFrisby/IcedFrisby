# IcedFrisby

[![Build Status](https://img.shields.io/circleci/project/github/IcedFrisby/IcedFrisby/master.svg)](https://circleci.com/gh/IcedFrisby/IcedFrisby/tree/master)
[![Coverage Status](https://img.shields.io/coveralls/github/IcedFrisby/IcedFrisby.svg)](https://coveralls.io/github/IcedFrisby/IcedFrisby)
[![npm](https://img.shields.io/npm/v/icedfrisby.svg)](http://www.npmjs.com/package/icedfrisby)
[![npm@next](https://img.shields.io/npm/v/icedfrisby/next.svg)](https://github.com/IcedFrisby/IcedFrisby/releases)


**IcedFrisby** is a Node.js library that makes testing API endpoints easy, fast and fun.

## :orange_book: API Documentation
The [**IcedFrisby** API Docs](https://github.com/IcedFrisby/IcedFrisby/blob/master/API.md) are located in [API.md](https://github.com/IcedFrisby/IcedFrisby/blob/master/API.md).

## Changelog
The [**IcedFrisby** Changelog](https://github.com/IcedFrisby/IcedFrisby/blob/master/CHANGELOG.md) is located in [CHANGELOG.md](https://github.com/IcedFrisby/IcedFrisby/blob/master/CHANGELOG.md).

## What makes IcedFrisby different?
* Uses [Mocha](https://github.com/mochajs/mocha) as the driver
* Uses [Chai](https://github.com/chaijs/chai) for assertions
* Uses [Joi][] for flexible and simple schema/type JSON validation
* `expectJSON(...)` is strict. Undefined/null fields are not ignored and missing fields are considered errors
* `expectContainsJSON(...)` tests JSON responses without knowing every field.
* Returns a 599 (network timeout error) response if a request times out or is unavailable instead of a 500

## Installation

Install IcedFrisby and Mocha from NPM:

    npm install mocha icedfrisby --save-dev

If you are using `expectJSONTypes`, install [Joi][] too:

    npm install joi --save-dev

IcedFrisby is built and tested against Node 6, 8, and 10.

[Joi]: https://github.com/hapijs/joi

## Show me some code!

IcedFrisby tests start with `frisby.create()` with a description of the test followed by one of `get()`, `put()`, `post()`, `delete()`, or `head()`, and ending with `toss()` to generate the resulting Mocha test. There is a `expectStatus()` method built in to more easily test HTTP status codes. Any other Mocha `expect` tests should be done inside the `after()` or `afterJSON()` callback.

Each set of unique sequences or API endpoint tests should be started with new `frisby.toss` method calls instead of trying to chain multiple HTTP requests together.

```javascript
const frisby = require('icedfrisby')
const Joi = require('joi')

const URL = 'http://localhost:3000/'
const URL_AUTH = 'http://username:password@localhost:3000/'

frisby.create('GET user johndoe')
  .get(URL + '/users/3.json')
  .addHeader('X-Auth-Token', 'fa8426a0-8eaf-4d22-8e13-7c1b16a9370c')
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
  .afterJSON(user => {
    // You can use any normal assertions here
    expect(1+1).to.equal(2)

    // Use data from previous result in next test
    frisby.create('Update user')
      .put(URL_AUTH + '/users/' + user.id + '.json', {tags: ['mocha', 'bdd']})
      .expectStatus(200)
      .toss()
  })
  .toss()
```

Any Mocha/Chai/whatever tests can be used inside the `after` and `afterJSON` callbacks to perform additional or custom tests on the response data.

## Running Tests

Run tests as you normally would with [Mocha](https://github.com/mochajs/mocha).

For example:

    cd your/project
    mocha tests/someTest.js --reporter nyan

Plugins
-------

Plugins can provide custom assertions, setup and teardown logic, and
additional functionality. Plugins can be implemented in an application's test
code or as a library.

- [icedfrisby-nock](https://github.com/paulmelnikow/icedfrisby-nock) &mdash;
  Concise support for mock requests
- [icedfrisby-jsonrefchecks](https://github.com/Fishbowler/icedfrisby-jsonrefchecks) &mdash;
  Check referential integrity between different sections of an API response

To use a plugin, compose IcedFrisby with it:

```js
const frisby = require('./icedfrisby-nock')(require('icedfrisby'))
```

or, more semantically, using the delightful [mixwith][]:

```js
const { mix } = require('mixwith')

const frisby = mix(require('icedfrisby')).with(require('./icedfrisby-nock'))
```

[mixwith]: https://github.com/justinfagnani/mixwith.js

Writing your own plugin is easy. For more details see [CONTRIBUTING.md].

## Contributing

Contributions are awesome! If you have an idea or code that you want to
contribute, feel free to open an issue or a pull request and we will gladly
review it. For more details see [CONTRIBUTING.md]

### Code Coverage

You can assess code coverage by running `npm run coverage`.

### Contributions

Contributions are awesome! If you have an idea or code that you want to
contribute, feel free to open an issue or a pull request and we will gladly
review it.

The library is post-1.0 now, so there is backward compatibility and future
maintainability to consider. If you are adding functionality, you can also
write a [plugin](#icedfrisby-plugins) and add a link here.

### Maintainers

IcedFrisby is maintained by:

* [Dan Caseley](https://github.com/Fishbowler)
* [Mark Herhold](https://github.com/MarkHerhold)
* [Paul Melnikow](https://github.com/paulmelnikow)
* [Casey Vega](https://github.com/cvega)


### Roadmap

1. Make output errors more useful. It can be hard to track down which assertion is causing what error.
1. Add a "stack trace" for paths to help discern why a path traversal failed
1. Support [chained tests/promises](https://github.com/vlucas/frisby/issues/223). Related: [#127](https://github.com/vlucas/frisby/issues/127), [#154](https://github.com/vlucas/frisby/issues/154), [#200](https://github.com/vlucas/frisby/issues/200)
1. ~~custom assertion plugin support~~ :rocket: [#27](https://github.com/IcedFrisby/icedfrisby/issues/27)

## Acknowledgements

IcedFrisby was originally based on the [Frisby](https://github.com/vlucas/frisby) project.

## License

Licensed under the [MIT](http://opensource.org/licenses/MIT)/[BSD](http://opensource.org/licenses/BSD-3-Clause) license.
