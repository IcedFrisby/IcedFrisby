# IcedFrisby Changelog

[Unreleased]: https://github.com/MarkHerhold/IcedFrisby/compare/1.5.0...HEAD
[1.5.0]: https://github.com/MarkHerhold/IcedFrisby/compare/1.5.0...1.4.0
[1.4.0]: https://github.com/MarkHerhold/IcedFrisby/compare/1.4.0...1.3.0
[1.3.1]: https://github.com/MarkHerhold/IcedFrisby/compare/1.4.0...1.3.0
[1.3.0]: https://github.com/MarkHerhold/IcedFrisby/compare/1.3.0...1.2.0
[1.2.0]: https://github.com/MarkHerhold/IcedFrisby/compare/1.2.0...1.1.0
[1.1.0]: https://github.com/MarkHerhold/IcedFrisby/compare/1.1.0...1.0.0

## [Unreleased][]

## [1.5.0][]

- Support header checks when multiple same-name headers exist ([PR #73][])
    - Invoke `expectHeader` or `expectHeaderContains` with a third argument
      `{ allowMultipleHeaders: true }`.
- `expectHeader` accepts regexes. `expectHeaderToMatch` is an alias.
  ([PR #73][])
- Upgrade Joi to 12.0.0.
- Drop support for Node 7. Continue support for Node 6 and 8.
- Improve documentation.

[PR #73]: https://github.com/MarkHerhold/IcedFrisby/pull/70

## [1.4.0][]

- Add only() helper ([PR #70][]).
- Improve documentation

[PR #70]: https://github.com/MarkHerhold/IcedFrisby/pull/70

## [1.3.1][]

- Add expectNoHeader() helper ([PR #63][]).

[PR #63]: https://github.com/MarkHerhold/IcedFrisby/pull/63

## [1.3.0][]

- Async hooks for before(), after(), finally() ([PR #59][]).
- Update chai assertion checking to ^4.0.1
- Update chalk to ^2.0.1

[PR #59]: https://github.com/MarkHerhold/IcedFrisby/pull/59

## [1.2.0][]

- Support extending via plugins. Frisby is an ES6 class, and plugins
  themselves are implemented as subclass factories. After being
  composed with plugins, `frisby.create()` will do the right thing.
  For an example, see https://github.com/paulmelnikow/icedfrisby-nock

## [1.1.0][]

- Added `finally()` hooks which run even after an error and can be used for
  cleanup. Throw a [MultiError][] if more than one error occurs. (#45)
- Fixed issue where printing frisby objects caused side effects (#44)
- Fixed bug where `after()` callbacks are erroneously invoked after an error
  in `before()` hook or request (#45)
- Moved all internal state from the Mocha context to the frisby object (#45)
- Improved test coverage

[MultiError]: https://github.com/joyent/node-verror#reference-multierror

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
* Refactored all expect() functions
* Uses [Mocha](https://github.com/mochajs/mocha) as the driver instead of Jasmine
* Uses [Chai](https://github.com/chaijs/chai) for assertions
* Uses [Joi](https://github.com/hapijs/joi) for flexible and simple schema/type JSON validation
* expectJSON(...) is now strict. Undefined/null fields are not ignored and missing fields are considered errors
* Adds expectContainsJSON(...)! Test JSON responses without knowing every field.
* Uses [lodash](https://github.com/lodash/lodash) instead of underscore
* Returns a 599 (network timeout error) response if a request times out or is unavailable instead of a 500
