'use strict'

const expect = require('chai').expect
const _ = require('lodash')
const checkTypes = require('check-types')

// setup Chai
const chai = require('chai')
global.expect = chai.expect
chai.config.includeStack = false
chai.use(require('chai-things')) // used to include.something...
chai.use(require('chai-subset')) // used to see if an object contains another

const pathMatch = {}

// performs a setup operation by checking the input data and merging the input data with a set of defaults
// returns the result of merging the default options and the input data
function setup(check) {
  if (!check) {
    throw new Error('Data to match is not defined')
  } else if (!check.jsonBody) {
    throw new Error('jsonBody is not defined')
  } else if (!check.jsonTest) {
    throw new Error('jsonTest is not defined')
  }

  // define the defaults
  const defaults = {
    isNot: false,
    path: undefined
    // jsonBody will be present
    // jsonTest will be present
  }

  // merge the passed in values with the defaults
  return _.merge(defaults, check)
}

// applies a path traversal by navigating through the jsonBody
// returns an object containing the last option specified in the path (*, ? or undefined) and
// the traversed json body
function applyPath(path, jsonBody, isNot) {
  // TODO input validation
  // * path cannot end in '.'
  // * path cannot be ''
  // * path cannot have more than one '*'/'?'
  // * path cannot start with ? or * and have more stuff after

  // states the last option in the path
  let lastOption

  // split up the path by '.'
  const pathSegments = path.split('.')
  // temporarially store the last option
  const tmpLast = pathSegments[pathSegments.length - 1]
  // if the last option is not a '*' or '?', set it to unefined as the developer didn't specify one
  if ('*' === tmpLast || '?' === tmpLast) {
    lastOption = tmpLast
  }

  try {
    // break apart the path and iterate through the keys to traverse through the JSON object
    pathSegments.forEach(segment => {
      // if the next 'segment' isn't actually a special character, traverse through the object
      if('*' !== segment && '?' !== segment) {
        jsonBody = jsonBody[segment]
      }
    })
  } catch(e) {
    if(!isNot) {
      throw e
    } else {
      console.warn("[IcedFrisby] You attempted to traverse through an object with a path ('" + path + "') that did not exist in the object. \
This issue was suppressed because you specified the isNot option. This behavior is usually considered an anti-pattern. Use a schema check instead.")
    }
  }

  return { lastOption, jsonBody }
}

// creates and returns an error object saying 1 of X objects should have matched
function expectedMatchErr(itemCount) {
  const objPlural = itemCount > 1 ? "objects" : "object"
  return new Error("Expected 1 out of " + itemCount + " " + objPlural + " to match provided JSON types")
}

// performs a complete JSON match
pathMatch.matchJSON = function(check) {
  // setup the data (validate check object, apply defaults)
  check = setup(check)

  // states the last option specified in the path (undefined, '*', or '?')
  let lastOption

  // traverse through a deep object if needed
  if(check.path) {
    const results = applyPath(check.path, check.jsonBody, check.isNot)
    lastOption = results.lastOption
    check.jsonBody = results.jsonBody
  }

  // EACH item in array should match
  if('*' === lastOption) {
    // assert that jsonBody is an array
    checkTypes.assert.array(check.jsonBody, "Expected an Array in the path '" + check.path + "' but got " + typeof(check.jsonBody))

    check.jsonBody.forEach(json => {
      if (check.isNot) {
        expect(json).to.not.deep.equal(check.jsonTest)
      } else {
        expect(json).to.deep.equal(check.jsonTest)
      }
    })

    // ONE item in array should match
  } else if('?' === lastOption) {
    // assert that jsonBody is an array
    checkTypes.assert.array(check.jsonBody, "Expected an Array in the path '" + check.path + "' but got " + typeof(check.jsonBody))

    const itemCount = check.jsonBody.length

    // check if there are any objects to match against. Don't do this for the .not case - having 0 elements would be valid.
    if (0 === itemCount && !check.isNot) {
      throw new Error('There are no JSON objects to match against')
    }

    if (check.isNot) {
      expect(check.jsonBody).to.not.include.something.that.deep.equals(check.jsonTest)
    } else {
      expect(check.jsonBody).to.include.something.that.deep.equals(check.jsonTest)
    }

    // Normal matcher, entire object/array should match
  } else {
    if (check.isNot) {
      expect(check.jsonBody).to.not.deep.equal(check.jsonTest)
    } else {
      expect(check.jsonBody).to.deep.equal(check.jsonTest)
    }
  }
}

// performs a partial JSON match where test object should be contained in the JSON response object
pathMatch.matchContainsJSON = function(check) {
  // setup the data (validate check object, apply defaults)
  check = setup(check)

  // states the last option specified in the path (undefined, '*', or '?')
  let lastOption

  // traverse through a deep object if needed
  if(check.path) {
    const results = applyPath(check.path, check.jsonBody, check.isNot)
    lastOption = results.lastOption
    check.jsonBody = results.jsonBody
  }

  if (checkTypes.not.object(check.jsonBody) && checkTypes.not.array(check.jsonBody)) {
    throw new Error("ContainsJSON does not support non-Array/Object datatypes. Got " + typeof(check.jsonBody) + " in JSON body")
  } else if (checkTypes.not.object(check.jsonTest) && checkTypes.not.array(check.jsonTest)) {
    throw new Error("ContainsJSON does not support non-Array/Object datatypes. Got " + typeof(check.jsonBody) + " in JSON test field")
  }

  // EACH item in array should match
  if('*' === lastOption) {
    // assert that jsonBody is an array
    checkTypes.assert.array(check.jsonBody, "Expected an Array in the path '" + check.path + "' but got " + typeof(check.jsonBody))

    check.jsonBody.forEach(json => {
      if (check.isNot) {
        expect(json).to.not.containSubset(check.jsonTest)
      } else {
        expect(json).to.containSubset(check.jsonTest)
      }
    })

    // ONE item in array should match
  } else if('?' === lastOption) {
    checkTypes.assert.array(check.jsonBody, "Expected an Array in the path '" + check.path + "' but got " + typeof(check.jsonBody))

    const itemCount = check.jsonBody.length
    let errorCount = 0

    // check if there are any objects to match against. Don't do this for the .not case - having 0 elements would be valid.
    if (0 === itemCount && !check.isNot) {
      throw new Error("There are no JSON objects to match against")
    }

    for (let i = 0; i < itemCount; i++) {
      try {
        expect(check.jsonBody[i]).to.containSubset(check.jsonTest)
      } catch (err) {
        /* istanbul ignore else */
        if ('AssertionError' === err.name) {
          // didn't match this object, increment number of errors
          errorCount++
        } else {
          // some error with the IcedFrisby or a dependency
          throw err
        }
      }
    }

    // If all errors, test fails
    if(itemCount === errorCount && !check.isNot) {
      throw expectedMatchErr(itemCount)
    }

    // Normal matcher, entire object should be contained
  } else {
    // handle (array of) objects, strings and numbers cases
    if (check.isNot) {
      expect(check.jsonBody).to.not.containSubset(check.jsonTest)
    } else {
      expect(check.jsonBody).to.containSubset(check.jsonTest)
    }
  }
}

// performs a complete JSON type match with Joi
pathMatch.matchJSONTypes = function(check) {
  // Since Joi is an optional depenency, only attempt to load it if it's used.
  let Joi
  try {
    Joi = require('joi')
  } catch(e) {
    throw Error('Joi is required to use expectJSONTypes, and must be installed separately')
  }

  // setup the data (validate check object, apply defaults)
  check = setup(check)

  // states the last option specified in the path (undefined, '*', or '?')
  let lastOption

  // traverse through a deep object if needed
  if(check.path) {
    const results = applyPath(check.path, check.jsonBody, check.isNot)
    lastOption = results.lastOption
    check.jsonBody = results.jsonBody
  }

  // keep track of errors for * and ? paths
  let errorCount = 0

  // EACH item in array should match
  if('*' === lastOption) {
    checkTypes.assert.array(check.jsonBody, "Expected an Array in the path '" + check.path + "' but got " + typeof(check.jsonBody))

    check.jsonBody.forEach(json => {
      // expect(json).toContainJsonTypes(jsonTest, self.current.isNot)
      Joi.validate(json, check.jsonTest, function(err, value) {
        if (err) {
          if (check.isNot) {
            // there is an error but isNot case is true. Increment counter.
            errorCount++
          } else {
            throw err
          }
        }
      })
    })

    // if this is the isNot case, ALL the validations should have failed for the '*' case
    if (check.isNot) {
      const delta = check.jsonBody.length - errorCount
      // if the error count is not the same as the number of elements, something validated successfully - which is a problem
      if (0 !== delta) {
        throw new Error('Expected all objects to be invalid but ' + delta + '/' + check.jsonBody.length + ' objects validated successfully')
      }
    }


    // ONE item in array should match
  } else if('?' === lastOption) {
    checkTypes.assert.array(check.jsonBody, "Expected an Array in the path '" + check.path + "' but got " + typeof(check.jsonBody))

    const itemCount = check.jsonBody.length

    // check if there are any objects to match against. Don't do this for the .not case - having 0 elements would be valid.
    if (0 === itemCount && !check.isNot) {
      throw new Error("There are no JSON objects to match against")
    }

    // callback function for a Joi validation
    const joiCb = function(err, value) {
      if (err) {
        // didn't match this object, increment number of errors
        errorCount++
      }
    }

    for (let i = 0; i < itemCount; i++) {
      Joi.validate(check.jsonBody[i], check.jsonTest, joiCb)
    }

    // If all errors, test fails
    if(itemCount === errorCount && !check.isNot) {
      throw expectedMatchErr(itemCount)
    }
    // Normal matcher, entire object/array should match
  } else {
    Joi.validate(check.jsonBody, check.jsonTest, function(err, value) {
      if (err && !check.isNot) {
        throw err
      }
    })
  }
}

// performs a length match on a string or object
pathMatch.matchJSONLength = function(check) {
  // setup the data (validate check object, apply defaults)
  check = setup(check)

  checkTypes.assert.object(check.jsonTest, 'JSON test must be an object')
  checkTypes.assert.integer(check.jsonTest.count, 'The count field must be an integer')
  // if the sign exists, check it
  if (check.jsonTest.sign) {
    checkTypes.assert.string(check.jsonTest.sign)
  } else {
    // default the sign char to null. This is necessary for the switch statement.
    check.jsonTest.sign = null
  }

  // states the last option specified in the path (undefined, '*', or '?')
  let lastOption

  // traverse through a deep object if needed
  if (check.path) {
    const results = applyPath(check.path, check.jsonBody, check.isNot)
    lastOption = results.lastOption
    check.jsonBody = results.jsonBody
  }

  // keep track of errors for * and ? paths
  let errorCount = 0

  // EACH item in array should match
  if ('*' === lastOption) {
    checkTypes.assert.array(check.jsonBody, "Expected an Array in the path '" + check.path + "' but got " + typeof(check.jsonBody))

    check.jsonBody.forEach(json => {
      try {
        expectLength(json, check.jsonTest)
      } catch (err) {
        /* istanbul ignore if */
        if ('AssertionError' !== err.name) {
          // some error with the IcedFrisby or a dependency
          throw err
        }

        if (check.isNot) {
          // there is an error but isNot case is true. Increment counter.
          errorCount++
        } else {
          throw err
        }
      }
    })

    // if this is the isNot case, ALL the validations should have failed for the '*' case
    if (check.isNot) {
      const delta = check.jsonBody.length - errorCount
      // if the error count is not the same as the number of elements, something validated successfully - which is a problem
      if (0 !== delta) {
        throw new Error('Expected all lengths to be invalid but ' + delta + '/' + check.jsonBody.length + ' lengths validated successfully')
      }
    }


    // ONE item in array should match
  } else if ('?' === lastOption) {
    checkTypes.assert.array(check.jsonBody, "Expected an Array in the path '" + check.path + "' but got " + typeof(check.jsonBody))

    const itemCount = check.jsonBody.length

    // check if there are any objects to match against. Don't do this for the .not case - having 0 elements would be valid.
    if (0 === itemCount && !check.isNot) {
      throw new Error("There are no JSON objects to match against")
    }

    check.jsonBody.forEach(json => {
      try {
        expectLength(json, check.jsonTest)
      } catch (err) {
        /* istanbul ignore if */
        if ('AssertionError' !== err.name) {
          // some error with the IcedFrisby or a dependency
          throw err
        }

        errorCount++
      }
    })

    // If all errors, test fails
    if (itemCount === errorCount && !check.isNot) {
      throw expectedMatchErr(itemCount)
    }
    // Normal matcher, entire object/array should match
  } else {
    try {
      expectLength(check.jsonBody, check.jsonTest)
    } catch (err) {
      if (!check.isNot) {
        throw err
      }
    }
  }
}

// expect length function for matchJSONLength that does the comparison operations
const expectLength = function(jsonBody, lengthSegments) {
  let len = 0

  if (_.isObject(jsonBody)) {
    len = Object.keys(jsonBody).length
  } else {
    len = jsonBody.length
  }

  let msg // message for expectation result
  //TODO: in the future, use expect(jsonBody).to.have.length.below(lengthSegments.count + 1); or similar for non-objects to get better assertion messages
  switch (lengthSegments.sign) {
    case "<=":
      msg = "Expected length to be less than or equal to " + lengthSegments.count + ", but got " + len
      expect(len).to.be.lessThan(lengthSegments.count + 1, msg)
      break
    case "<":
      msg = "Expected length to be less than " + lengthSegments.count + ", but got " + len
      expect(len).to.be.lessThan(lengthSegments.count, msg)
      break
    case ">=":
      msg = "Expected length to be greater than or equal " + lengthSegments.count + ", but got " + len
      expect(len).to.be.greaterThan(lengthSegments.count - 1, msg)
      break
    case ">":
      msg = "Expected length to be greater than " + lengthSegments.count + ", but got " + len
      expect(len).to.be.greaterThan(lengthSegments.count, msg)
      break
    case null:
      msg = "Expected length to be " + lengthSegments.count + ", but got " + len
      expect(len).to.equal(lengthSegments.count, msg)
      break
  } //end switch
}

module.exports = pathMatch
