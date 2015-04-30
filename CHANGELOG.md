# IcedFrisby Changelog

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
