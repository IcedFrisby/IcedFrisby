# IcedFrisby Changelog

## 2.1.0

- Add `skip()` and `skipIf()` methods.

## 2.0.0

This release involves a substantial rewrite and several breaking changes from
2.0.0. The changes since 1.5.0 are summarized here.

### Breaking changes

- Joi is now an optional dependency. If you are using `expectJSONTypes` you
  must install Joi on your own.
- IcedFrisby has dropped support for Node 6 and now requires Node 8+.
- `globalConfig()` has been removed. Each test can be independently
  configured using `config()`, which takes the same options. `reset()` has
  also been removed.
- The plugin interface has changed. `this.current.expects` has been removed.
  Plugins should use `after()` instead.

### New features

- An `async run()` method has been added. This allows running IcedFrisby
  tests within `it()` blocks or using a test runner other than Mocha.

### Bug fixes

- Fix `timeout()` and `retry()` ([PR #71][])
  - Retry on errors, not just timeouts
  - Back off between retries
  - Global setup respects `retryBackoff` option
  - Configure Mocha’s timeout to accommodate `.timeout()` and `.retry()`
- Clean up after `useApp()` ([PR #72][])

### Other changes

- Remove `setResponseType` and other `setResponseX` functions which were
  not part of the public API and were unused internally.
- Significantly improve API documentation.
- Rewrite a bunch of internals using `async`.
- Rewrite tests using `async` and `run()`.
- Improve test coverage.
- Update dependencies.

## 2.0.0-alpha.5

### Bug fixes

- Correctly emit exceptions from `after()` and `finally()`

## 2.0.0-alpha.4

### Other changes

- Rewrite a bunch of internals using `async`.
- Rewrite tests using `async` and `run()`.
- Update `check-types` dependency.

## 2.0.0-alpha.3

### Breaking changes

- Remove support for Node 6.

### New features

- Add `async run()` method to support running IcedFrisby within `it()` blocks or
  using a test runner other than Mocha.

### Other changes

- Improve test coverage.
- Improve documentation.
- Update dependencies.

## 2.0.0-alpha.2

### Breaking changes

- Remove globalConfig() ([PR #106])
  - Each request can be independently configured with config() which takes the same options
  - Also removes reset() since that was only useful globalConfig()
- Change to plugin interface ([PR #100])
  - this.current.expects is gone, use after() instead

### Other changes

- Under the hood improvements to code ([PR #100], [PR #105], [PR #107])
- Upgrade to Mocha 5.0.1 ([PR #108])

[pr #100]: https://github.com/IcedFrisby/IcedFrisby/pull/100
[pr #105]: https://github.com/IcedFrisby/IcedFrisby/pull/105
[pr #106]: https://github.com/IcedFrisby/IcedFrisby/pull/106
[pr #107]: https://github.com/IcedFrisby/IcedFrisby/pull/107
[pr #108]: https://github.com/IcedFrisby/IcedFrisby/pull/108

## 2.0.0-alpha.1

### Breaking changes

- Make Joi an optional dependency. ([PR #84][])
  - Joi is only used when the developer invokes `expectJSONTypes`
  - The developer must install Joi on their own.
  - The developer can specify the version number of their choice. Upgrading
    IcedFrisby does not affect the Joi version. Joi 12.0.0 works with Node
    6+, 13.0.0 with Node 8+.
  - The developer's specified version is the only copy of Joi installed.

### Bug fixes

- Significantly improve API documentation ([PR #94][])
- Remove `setResponseType` and other `setResponseX` functions which were
  not part of the public API and are unused internally. ([PR #89][])
- Fix `timeout()` and `retry()` ([PR #71][])
  - Retry on errors, not just timeouts
  - Back off between retries
  - Global setup respects `retryBackoff` option
  - Configure Mocha’s timeout to accommodate `.timeout()` and `.retry()`
- Clean up after `useApp()` ([PR #72][])
- Tidy request code ([PR #101][])

[pr #71]: https://github.com/IcedFrisby/IcedFrisby/pull/71
[pr #72]: https://github.com/IcedFrisby/IcedFrisby/pull/72
[pr #73]: https://github.com/IcedFrisby/IcedFrisby/pull/73
[pr #84]: https://github.com/IcedFrisby/IcedFrisby/pull/84
[pr #89]: https://github.com/IcedFrisby/IcedFrisby/pull/89
[pr #94]: https://github.com/IcedFrisby/IcedFrisby/pull/94
[pr #101]: https://github.com/IcedFrisby/IcedFrisby/pull/101

## 1.5.0

- Support header checks when multiple same-name headers exist ([PR #73][])
  - Invoke `expectHeader` or `expectHeaderContains` with a third argument
    `{ allowMultipleHeaders: true }`.
- `expectHeader` accepts regexes. `expectHeaderToMatch` is an alias.
  ([PR #73][])
- Upgrade Joi to 12.0.0.
- Drop support for Node 7. Continue support for Node 6 and 8.
- Improve documentation.

[pr #73]: https://github.com/IcedFrisby/IcedFrisby/pull/70

## 1.4.0

- Add only() helper ([PR #70][]).
- Improve documentation

[pr #70]: https://github.com/IcedFrisby/IcedFrisby/pull/70

## 1.3.1

- Add expectNoHeader() helper ([PR #63][]).

[pr #63]: https://github.com/IcedFrisby/IcedFrisby/pull/63

## 1.3.0

- Async hooks for before(), after(), finally() ([PR #59][]).
- Update chai assertion checking to ^4.0.1
- Update chalk to ^2.0.1

[pr #59]: https://github.com/IcedFrisby/IcedFrisby/pull/59

## 1.2.0

- Support extending via plugins. Frisby is an ES6 class, and plugins
  themselves are implemented as subclass factories. After being
  composed with plugins, `frisby.create()` will do the right thing.
  For an example, see https://github.com/paulmelnikow/icedfrisby-nock

## 1.1.0

- Added `finally()` hooks which run even after an error and can be used for
  cleanup. Throw a [MultiError][] if more than one error occurs. (#45)
- Fixed issue where printing frisby objects caused side effects (#44)
- Fixed bug where `after()` callbacks are erroneously invoked after an error
  in `before()` hook or request (#45)
- Moved all internal state from the Mocha context to the frisby object (#45)
- Improved test coverage

[multierror]: https://github.com/joyent/node-verror#reference-multierror

## 1.0.0

- Identical API to 0.4.0

## 0.4.0

- Added support for plugins
  - Added `before()` callbacks
  - Exported the constructor, not just the `create()` function
- Added `baseURI()` to set base URI without using `globalSetup()`
- Improved test coverage
- Upgraded dependencies to latest versions, including lodash 4.x branch

## 0.3.0

- Upgraded dependencies to latest versions
- Fixed a bug with hostnames that resolve but don't respond
- **Breaking Changes**
  - Support for <= 0.12 is deprecated (LTS support ends December 2016)
  - Set builds targets to latest stable versions of Node.js, 4, 5 and 6

## 0.2.4

- Don't start the app specified in useApp for every test, only once per global setup

## 0.2.3

- Added capability to use useApp in global setup

## 0.2.2

- Fixed issue where the Content-Type header is incorrectly overwritten when sending JSON data.

## 0.2.1

- Updated `chai` and `qs`. Nailed down `nock` dependency version.

## 0.2.0

- Added useApp(app, baseUri) method

## 0.1.2

- Fixed issue [#6](https://github.com/RobertHerhold/IcedFrisby/issues/6) where the inspect functions are not called if the test fails. Inspect functions are now run before the expect functions.

## 0.1.1

- Removed `[IcedFrisby]` branding from all mocha tests as per [#5](https://github.com/RobertHerhold/IcedFrisby/pull/5)
- [Devs] added JSHint to the build to help enforce code quality

## 0.1.0

- Added this changelog
- Fixed faulty global setup tests
- **Breaking Changes**
  - Fixed an issue where the JSON flag was getting set from `global setup` instead of `current`
  - Fixed an issue where the outgoing uri was getting set from `global setup` instead of `current`
  - Fixed an issue where global setup would not be fully reset (json flag, base path, etc. were not reset) when reset() was called

## < 0.1.0 (forked from [Frisby](https://github.com/vlucas/frisby))

- Refactored all expect() functions
- Uses [Mocha](https://github.com/mochajs/mocha) as the driver instead of Jasmine
- Uses [Chai](https://github.com/chaijs/chai) for assertions
- Uses [Joi](https://github.com/hapijs/joi) for flexible and simple schema/type JSON validation
- expectJSON(...) is now strict. Undefined/null fields are not ignored and missing fields are considered errors
- Adds expectContainsJSON(...)! Test JSON responses without knowing every field.
- Uses [lodash](https://github.com/lodash/lodash) instead of underscore
- Returns a 599 (network timeout error) response if a request times out or is unavailable instead of a 500
