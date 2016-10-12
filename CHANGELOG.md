# IcedFrisby Changelog

## 0.2.5
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
