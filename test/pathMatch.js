var pm = require('../lib/pathMatch');

var Joi = require('joi');

var chai = require('chai');
chai.should(); // setup should assertions
chai.use(require('chai-things'));
// chai.config.includeStack = true;
global.expect = chai.expect;


// JSON to use in mock tests
var fixtures = require('./fixtures/repetition_fixture.json');
var usersFixture = require('./fixtures/users_fixture.json');


//
// PATH TRAVERSAL
//
describe('Path traversal', function() {
    it('should fail on a bad path', function() {
        var fn = function() {
            // apply path is not exposed, so we will just use matchJSON, which calls it
            pm.matchJSON({
                jsonBody: { a: { } },
                jsonTest: { },
                path: 'a.b.c.d.e.f',
                isNot: false
            });
        };
        expect(fn).to.throw(/Cannot read property 'c' of undefined/);
    });

    it('should not fail on a bad path with isNot specified (even though this is an anti-pattern)', function() {
        // apply path is not exposed, so we will just use matchJSON, which calls it
        pm.matchJSON({
            jsonBody: { a: { } },
            jsonTest: { },
            path: 'a.b.c.d.e.f',
            isNot: true
        });
    });
});

//
// JSON MATCH
//
describe('Path match JSON', function() {

    describe('Sanity error checking', function() {
        it('should fail if nothing is provided', function() {
            var fn = function() {
                pm.matchJSON();
            };
            expect(fn).to.throw('Data to match is not defined');
        });

        it('should fail if no jsonBody is provided', function() {
            var fn = function() {
                pm.matchJSON({
                    jsonBody: undefined,
                    jsonTest: {}
                });
            };
            expect(fn).to.throw('jsonBody is not defined');
        });

        it('should fail if no jsonTest is provided', function() {
            var fn = function() {
                pm.matchJSON({
                    jsonBody: {},
                    jsonTest: undefined
                });
            };
            expect(fn).to.throw('jsonTest is not defined');
        });
    });

    it('should be a function', function() {
        expect(pm.matchJSON).to.be.a('function');
    });

    it('should match a simple json object', function() {
        pm.matchJSON({
            jsonBody: {},
            jsonTest: {}
        });
    });

    it('should detect a mismatching object', function() {
        var fn = function() {
            pm.matchJSON({
                jsonBody: {},
                jsonTest: true
            });
        };
        expect(fn).to.throw(/expected {} to .*? equal true/);
    });

    it('should allow a mismatching object with isNot set', function() {
        pm.matchJSON({
            jsonBody: {},
            jsonTest: true,
            isNot: true
        });
    });

    it('should match the same object', function() {
        pm.matchJSON({
            jsonBody: fixtures,
            jsonTest: fixtures
        });
    });

    it('should match one object in an array with a \'?\' path', function() {
        pm.matchJSON({
            jsonBody: fixtures.arrayOfObjects.test_subjects,
            jsonTest: fixtures.arrayOfObjects.test_subjects[2],
            path: '?'
        });
    });

    it('should not match any objects in an array with a \'?\' path', function() {
        var fn = function() {
            pm.matchJSON({
                jsonBody: fixtures.differentNumbers,
                jsonTest: {
                    num: 999
                },
                path: '?'
            });
        };

        expect(fn).to.throw(/expected .*? to .*? equal .*?/);
    });

    it('should match all objects in an array with a \'*\' path', function() {
        pm.matchJSON({
            jsonBody: fixtures.sameNumbers,
            jsonTest: fixtures.sameNumbers[2],
            path: '*'
        });
    });

    it('should not match any objects in an array with a \'*\' path', function() {
        var fn = function() {
            pm.matchJSON({
                jsonBody: fixtures.sameNumbers,
                jsonTest: {
                    num: 999
                },
                path: '*'
            });
        };

        expect(fn).to.throw(/expected .*? to .*? equal .*?/);
    });

    it('should match one object in an array with an \'array.?\' path', function() {
        pm.matchJSON({
            jsonBody: fixtures,
            jsonTest: fixtures.differentNumbers[2],
            path: 'differentNumbers.?'
        });
    });

    it('should not match one object in an array with an \'array.?\' path', function() {
        var fn = function() {
            pm.matchJSON({
                jsonBody: fixtures,
                jsonTest: {
                    num: 999
                },
                path: 'differentNumbers.?'
            });
        };

        expect(fn).to.throw(/expected .*? to .*? equal .*?/);
    });

    it('should match all objects in an array with an \'array.*\' path', function() {
        pm.matchJSON({
            jsonBody: fixtures,
            jsonTest: fixtures.sameNumbers[2],
            path: 'sameNumbers.*'
        });
    });

    it('should not match any objects in an array with an \'array.*\' path', function() {
        var fn = function() {
            pm.matchJSON({
                jsonBody: fixtures,
                jsonTest: {
                    num: 999
                },
                path: 'sameNumbers.*'
            });
        };

        expect(fn).to.throw(/expected .*? to .*? equal .*?/);
    });

    it('should not allow an empty array with a \'?\' path', function() {
        var fn = function() {
            pm.matchJSON({
                jsonBody: [],
                jsonTest: {
                    num: 5
                },
                path: '?'
            });
        };

        expect(fn).to.throw('There are no JSON objects to match against');
    });
});


//
// JSON CONTAINS
//
describe('Path match Contains JSON', function() {
    describe('Sanity error checking', function() {
        it('should fail if nothing is provided', function() {
            var fn = function() {
                pm.matchContainsJSON();
            };
            expect(fn).to.throw('Data to match is not defined');
        });

        it('should fail if no jsonBody is provided', function() {
            var fn = function() {
                pm.matchContainsJSON({
                    jsonBody: undefined,
                    jsonTest: {}
                });
            };
            expect(fn).to.throw('jsonBody is not defined');
        });

        it('should fail if no jsonTest is provided', function() {
            var fn = function() {
                pm.matchContainsJSON({
                    jsonBody: {},
                    jsonTest: undefined
                });
            };
            expect(fn).to.throw('jsonTest is not defined');
        });
    });

    it('should be a function', function() {
        expect(pm.matchContainsJSON).to.be.a('function');
    });

    it('should match a simple json object', function() {
        pm.matchContainsJSON({
            jsonBody: {},
            jsonTest: {}
        });
    });

    it('should not match a simple json object', function() {
        var fn = function() {
            pm.matchContainsJSON({
                jsonBody: {},
                jsonTest: { bad: true }
            });
        };
        expect(fn).to.throw();
    });

    it('should match a simple json object when isNot is set', function() {
        pm.matchContainsJSON({
            jsonBody: {},
            jsonTest: { bad: true },
            isNot: true
        });
    });

    it('should not match a non-Array/Object in the body field', function() {
        var fn = function() {
            pm.matchContainsJSON({
                jsonBody: true,
                jsonTest: {}
            });
        };
        expect(fn).to.throw(/ContainsJSON does not support non-Array\/Object datatypes/);
    });

    it('should not match a non-Array/Object in the body field', function() {
        var fn = function() {
            pm.matchContainsJSON({
                jsonBody: 111,
                jsonTest: {}
            });
        };
        expect(fn).to.throw(/ContainsJSON does not support non-Array\/Object datatypes/);
    });

    it('should not match a non-Array/Object in the test field', function() {
        var fn = function() {
            pm.matchContainsJSON({
                jsonBody: {},
                jsonTest: true
            });
        };
        expect(fn).to.throw(/ContainsJSON does not support non-Array\/Object datatypes/);
    });

    it('should not match a non-Array/Object in the test field', function() {
        var fn = function() {
            pm.matchContainsJSON({
                jsonBody: {},
                jsonTest: 111
            });
        };
        expect(fn).to.throw(/ContainsJSON does not support non-Array\/Object datatypes/);
    });


    it('should match one object in an array with a \'?\' path', function() {
        pm.matchContainsJSON({
            jsonBody: fixtures.arrayOfObjects.test_subjects,
            jsonTest: fixtures.arrayOfObjects.test_subjects[2],
            path: '?'
        });
    });

    it('should not match any objects in an array with a \'?\' path', function() {
        var fn = function() {
            pm.matchContainsJSON({
                jsonBody: fixtures.differentNumbers,
                jsonTest: {
                    num: 999
                },
                path: '?'
            });
        };

        expect(fn).to.throw();
    });

    it('should not match any objects in a single element array with a \'?\' path', function() {
        var fn = function() {
            pm.matchContainsJSON({
                jsonBody: [{ num: 6 }],
                jsonTest: {
                    num: 999
                },
                path: '?'
            });
        };

        expect(fn).to.throw();
    });

    it('should match all objects in an array with a \'*\' path', function() {
        pm.matchContainsJSON({
            jsonBody: fixtures.sameNumbers,
            jsonTest: fixtures.sameNumbers[2],
            path: '*'
        });
    });

    it('should not match any objects in an array with a \'*\' path', function() {
        var fn = function() {
            pm.matchContainsJSON({
                jsonBody: fixtures.sameNumbers,
                jsonTest: {
                    num: 999
                },
                path: '*'
            });
        };

        expect(fn).to.throw();
    });

    it('should match one object in an array with an \'array.?\' path', function() {
        pm.matchContainsJSON({
            jsonBody: fixtures,
            jsonTest: fixtures.differentNumbers[2],
            path: 'differentNumbers.?'
        });
    });

    it('should not match one object in an array with an \'array.?\' path', function() {
        var fn = function() {
            pm.matchContainsJSON({
                jsonBody: fixtures,
                jsonTest: {
                    num: 999
                },
                path: 'differentNumbers.?'
            });
        };

        expect(fn).to.throw();
    });

    it('should match all objects in an array with an \'array.*\' path', function() {
        pm.matchContainsJSON({
            jsonBody: fixtures,
            jsonTest: fixtures.sameNumbers[2],
            path: 'sameNumbers.*'
        });
    });

    it('should not match any objects in an array with an \'array.*\' path and isNot set', function() {
        pm.matchContainsJSON({
            jsonBody: fixtures,
            jsonTest: { num: 999 },
            path: 'sameNumbers.*',
            isNot: true
        });
    });

    it('should not match any objects in an array with an \'array.*\' path', function() {
        var fn = function() {
            pm.matchContainsJSON({
                jsonBody: fixtures,
                jsonTest: {
                    num: 999
                },
                path: 'sameNumbers.*'
            });
        };

        expect(fn).to.throw();
    });

    it('should not match an empty array with a \'?\' path', function() {
        var fn = function() {
            pm.matchContainsJSON({
                jsonBody: [],
                jsonTest: {
                    num: 5
                },
                path: '?'
            });
        };

        expect(fn).to.throw('There are no JSON objects to match against');
    });

    describe('real use case: users & passwords', function() {

        // NOTE: the first user in usersFixture has the 'password' and 'salt' fields to represent leaked information.
        // No other users in the fixture have this.

        it('should match a user\'s first name', function() {
            pm.matchContainsJSON({
                jsonBody: usersFixture.users[0],
                jsonTest: {
                    first: usersFixture.users[0].name.first
                },
                path: 'name'
            });
        });

        it('should match a user\'s email', function() {

            // NOTE: the first user has a password and salt field. No other users do.

            pm.matchContainsJSON({
                jsonBody: usersFixture.users[0],
                jsonTest: {
                    email: usersFixture.users[0].email
                }
            });
        });

        it('should match one user\'s email with a \'?\' path', function() {
            pm.matchContainsJSON({
                jsonBody: usersFixture.users,
                jsonTest: {
                    email: usersFixture.users[3].email
                },
                path: '?'
            });
        });

        it('should match a (nested) user\'s first name with a path', function() {
            pm.matchContainsJSON({
                jsonBody: usersFixture.users[0],
                jsonTest: {
                    first: usersFixture.users[0].name.first
                },
                path: 'name'
            });
        });

        it('should match a user\'s salt and throw an error when isNot is set', function() {

            // NOTE: the first user has a password and salt field. No other users do.

            var fn = function() {
                pm.matchContainsJSON({
                    jsonBody: usersFixture.users[0],
                    jsonTest: {
                        salt: usersFixture.users[0].salt
                    },
                    isNot: true
                });
            };

            expect(fn).to.throw();
        });

        it('should match a user\'s password and throw an error when isNot is set', function() {

            // NOTE: the first user has a password and salt field. No other users do.

            var fn = function() {
                pm.matchContainsJSON({
                    jsonBody: usersFixture.users[0],
                    jsonTest: {
                        password: usersFixture.users[0].password
                    },
                    isNot: true
                });
            };

            expect(fn).to.throw();
        });

        it('should match an object without the id present', function() {
            pm.matchContainsJSON({
                jsonBody: {
                    id: 158254613,
                    someStuff: 'some text',
                    someNumber: 55
                },
                jsonTest: {
                    someStuff: 'some text',
                    someNumber: 55
                }
            });
        });
    });
});


//
// JSON TYPE
//
describe('Path match JSON Types', function() {

    describe('Sanity error checking', function() {
        it('should fail if nothing is provided', function() {
            var fn = function() {
                pm.matchJSON();
            };
            expect(fn).to.throw('Data to match is not defined');
        });

        it('should fail if no jsonBody is provided', function() {
            var fn = function() {
                pm.matchJSON({
                    jsonBody: undefined,
                    jsonTest: {}
                });
            };
            expect(fn).to.throw('jsonBody is not defined');
        });

        it('should fail if no jsonTest is provided', function() {
            var fn = function() {
                pm.matchJSON({
                    jsonBody: {},
                    jsonTest: undefined
                });
            };
            expect(fn).to.throw('jsonTest is not defined');
        });
    });

    it('should be a function', function() {
        expect(pm.matchJSONTypes).to.be.a('function');
    });

    it('should allow a simple object', function() {
        pm.matchJSONTypes({
            jsonBody: fixtures.singleObject,
            jsonTest: {
                test_str: Joi.string().required(),
                test_str_same: Joi.string().required(),
                test_int: Joi.number().required(),
                test_optional: Joi.any().optional()
            }
        });
    });

    it('should disallow an invalid simple object', function() {
        var fn = function() {
            pm.matchJSONTypes({
                jsonBody: fixtures.singleObject,
                jsonTest: {
                    nonexistentField: Joi.any().required(),
                    test_str: Joi.string().required(),
                    test_str_same: Joi.string().required(),
                    test_int: Joi.number().required(),
                    test_optional: Joi.any().optional()
                }
            });
        };

        expect(fn).to.throw('child "nonexistentField" fails because ["nonexistentField" is required]');
    });

    it('should allow a simple object with isNot set', function() {
        pm.matchJSONTypes({
            jsonBody: fixtures.singleObject,
            jsonTest: {
                nonexistentField: Joi.any().required(),
                test_str: Joi.string().required(),
                test_str_same: Joi.string().required(),
                test_int: Joi.number().required(),
                test_optional: Joi.any().optional()
            },
            isNot: true
        });
    });

    it('should allow one object in an array with a \'?\' path', function() {
        pm.matchJSONTypes({
            jsonBody: fixtures.differentNumbers,
            jsonTest: {
                num: Joi.number().required().valid(fixtures.differentNumbers[2].num)
            },
            path: '?'
        });
    });

    it('should not allow any objects in an array with a \'?\' path', function() {
        var fn = function() {
            pm.matchJSONTypes({
                jsonBody: fixtures.differentNumbers,
                jsonTest: {
                    num: Joi.number().required().valid(999)
                },
                path: '?'
            });
        };

        expect(fn).to.throw(/Expected 1 out of [0-9]+ objects to match/);
    });

    it('should allow all objects with a \'*\' path', function() {
        pm.matchJSONTypes({
            jsonBody: fixtures.sameNumbers,
            jsonTest: {
                num: Joi.number().required().valid(fixtures.sameNumbers[2].num)
            },
            path: '*'
        });
    });

    it('should not allow any objects with a \'*\' path', function() {
        var fn = function() {
            pm.matchJSONTypes({
                jsonBody: fixtures.differentNumbers,
                jsonTest: {
                    num: Joi.number().required().valid(999)
                },
                path: '*'
            });
        };

        expect(fn).to.throw('"num" fails because ["num" must be one of [999]]');
    });

    it('should allow one object in an array with an \'array.?\' path', function() {
        pm.matchJSONTypes({
            jsonBody: fixtures,
            jsonTest: {
                num: Joi.number().required().valid(fixtures.differentNumbers[2].num)
            },
            path: 'differentNumbers.?'
        });
    });

    it('should not allow any objects in an array with an \'array.?\' path', function() {
        var fn = function() {
            pm.matchJSONTypes({
                jsonBody: fixtures,
                jsonTest: {
                    num: 999
                },
                path: 'differentNumbers.?'
            });
        };

        expect(fn).to.throw(/Expected 1 out of [0-9]+ objects to match/);
    });

    it('should allow all objects in an array with an \'array.*\' path', function() {
        pm.matchJSONTypes({
            jsonBody: fixtures,
            jsonTest: {
                num: Joi.number().required().valid(fixtures.sameNumbers[2].num)
            },
            path: 'sameNumbers.*'
        });
    });

    it('should not allow any objects in an array with an \'array.*\' path', function() {
        var fn = function() {
            pm.matchJSONTypes({
                jsonBody: fixtures,
                jsonTest: {
                    num: 999
                },
                path: 'sameNumbers.*'
            });
        };

        expect(fn).to.throw('"num" fails because ["num" must be one of [999]]');
    });

    it('should allow any object in an array with an \'array.*\' path when isNot is set', function() {
        pm.matchJSONTypes({
            jsonBody: fixtures,
            jsonTest: {
                num: Joi.boolean().required() // <-- this is completely wrong
            },
            path: 'sameNumbers.*',
            isNot: true
        });
    });

    it('should not allow any object in an array with an \'array.*\' path when isNot is set', function() {
        var fn = function() {
            pm.matchJSONTypes({
                jsonBody: fixtures,
                jsonTest: {
                    num: Joi.number().required().valid(5)
                },
                path: 'differentNumbers.*',
                isNot: true
            });
        };

        expect(fn).to.throw(/Expected all objects to be invalid but [0-9]+\/[0-9]+ objects validated successfully/);
    });

    it('should not allow an empty array with a \'?\' path', function() {
        var fn = function() {
            pm.matchJSONTypes({
                jsonBody: [],
                jsonTest: {
                    num: Joi.any().required()
                },
                path: '?'
            });
        };

        expect(fn).to.throw('There are no JSON objects to match against');
    });

});

//
// JSON LENGTH
//
describe('Path match JSON Length', function() {
    describe('Sanity error checking', function() {
        it('should fail if nothing is provided', function() {
            var fn = function() {
                pm.matchJSONLength();
            };
            expect(fn).to.throw('Data to match is not defined');
        });

        it('should fail if no jsonBody is provided', function() {
            var fn = function() {
                pm.matchJSONLength({
                    jsonBody: undefined,
                    jsonTest: {}
                });
            };
            expect(fn).to.throw('jsonBody is not defined');
        });

        it('should fail if no jsonTest is provided', function() {
            var fn = function() {
                pm.matchJSONLength({
                    jsonBody: {},
                    jsonTest: undefined
                });
            };
            expect(fn).to.throw('jsonTest is not defined');
        });
    });

    it('should be a function', function() {
        expect(pm.matchJSONLength).to.be.a('function');
    });

    it('should length match a simple json object', function() {
        pm.matchJSONLength({
            jsonBody: {},
            jsonTest: {
                count: 0,
                sign: null
            }
        });
    });

    it('should length match a simple string object', function() {
        pm.matchJSONLength({
            jsonBody: 'hello',
            jsonTest: {
                count: 5,
                sign: null
            }
        });
    });

    describe('simple string matching with sign', function() {
        it('should length match a simple string object with the \'<=\' sign', function() {
            pm.matchJSONLength({
                jsonBody: 'hello',
                jsonTest: {
                    count: 6,
                    sign: '<='
                }
            });
        });

        it('should length match a simple string object with the \'<=\' sign', function() {
            pm.matchJSONLength({
                jsonBody: 'hello',
                jsonTest: {
                    count: 5,
                    sign: '<='
                }
            });
        });

        it('should not length match a simple string object with the \'<=\' sign', function() {
            var fn = function() {
                pm.matchJSONLength({
                    jsonBody: 'hello',
                    jsonTest: {
                        count: 4,
                        sign: '<='
                    }
                });
            };
            expect(fn).to.throw(/Expected length/);
        });

        it('should length match a simple string object with the \'<=\' sign when isNot is set', function() {
            pm.matchJSONLength({
                jsonBody: 'hello',
                jsonTest: {
                    count: 4,
                    sign: '<='
                },
                isNot: true
            });
        });

        it('should length match a simple string object with the \'<\' sign', function() {
            pm.matchJSONLength({
                jsonBody: 'hello',
                jsonTest: {
                    count: 6,
                    sign: '<'
                }
            });
        });

        it('should not length match a simple string object with the \'<\' sign', function() {
            var fn = function() {
                pm.matchJSONLength({
                    jsonBody: 'hello',
                    jsonTest: {
                        count: 5,
                        sign: '<'
                    }
                });
            };
            expect(fn).to.throw(/Expected length/);
        });

        it('should length match a simple string object with the \'<\' sign when isNot is set', function() {
            pm.matchJSONLength({
                jsonBody: 'hello',
                jsonTest: {
                    count: 5,
                    sign: '<'
                },
                isNot: true
            });
        });

        it('should not length match a simple string object with the \'>=\' sign', function() {
            var fn = function() {
                pm.matchJSONLength({
                    jsonBody: 'hello',
                    jsonTest: {
                        count: 6,
                        sign: '>='
                    }
                });
            };
            expect(fn).to.throw(/Expected length/);
        });

        it('should length match a simple string object with the \'>=\' sign when isNot is set', function() {
            pm.matchJSONLength({
                jsonBody: 'hello',
                jsonTest: {
                    count: 6,
                    sign: '>='
                },
                isNot: true
            });
        });


        it('should length match a simple string object with the \'>=\' sign', function() {
            pm.matchJSONLength({
                jsonBody: 'hello',
                jsonTest: {
                    count: 5,
                    sign: '>='
                }
            });
        });

        it('should length match a simple string object with the \'>=\' sign', function() {
            pm.matchJSONLength({
                jsonBody: 'hello',
                jsonTest: {
                    count: 4,
                    sign: '>='
                }
            });
        });

        it('should not length match a simple string object with the \'>\' sign', function() {
            var fn = function() {
                pm.matchJSONLength({
                    jsonBody: 'hello',
                    jsonTest: {
                        count: 5,
                        sign: '>'
                    }
                });
            };
            expect(fn).to.throw(/Expected length/);
        });

        it('should length match a simple string object with the \'>\' sign when isNot is set', function() {
            pm.matchJSONLength({
                jsonBody: 'hello',
                jsonTest: {
                    count: 5,
                    sign: '>'
                },
                isNot: true
            });
        });

        it('should length match a simple string object with the \'>\' sign', function() {
            pm.matchJSONLength({
                jsonBody: 'hello',
                jsonTest: {
                    count: 4,
                    sign: '>'
                }
            });
        });
    });

    it('should not length match a simple json object', function() {
        var fn = function() {
            pm.matchJSONLength({
                jsonBody: {},
                jsonTest: {
                    count: 'bad'
                }
            });
        };
        expect(fn).to.throw();
    });

    it('should not length match a simple string object', function() {
        var fn = function() {
            pm.matchJSONLength({
                jsonBody: 'bad',
                jsonTest: {
                    count: 999
                }
            });
        };
        expect(fn).to.throw(/Expected length/);
    });

    it('should length match a simple json object when isNot is set', function() {
        pm.matchJSONLength({
            jsonBody: {},
            jsonTest: {
                count: 1
            },
            isNot: true
        });
    });

    it('should length match one object in an array with a \'?\' path', function() {
        pm.matchJSONLength({
            jsonBody: fixtures.differentSizeObjects,
            jsonTest: {
                count: 2
            },
            path: '?'
        });
    });

    it('should not length match any objects in an array with a \'?\' path', function() {
        var fn = function() {
            pm.matchJSONLength({
                jsonBody: fixtures.differentSizeObjects,
                jsonTest: {
                    count: 999
                },
                path: '?'
            });
        };

        expect(fn).to.throw();
    });

    it('should not length match any objects in a single element array with a \'?\' path', function() {
        var fn = function() {
            pm.matchJSONLength({
                jsonBody: [{ num: 6 }],
                jsonTest: {
                    count: 999
                },
                path: '?'
            });
        };

        expect(fn).to.throw();
    });

    it('should length match all objects in an array with a \'*\' path', function() {
        pm.matchJSONLength({
            jsonBody: fixtures.sameNumbers,
            jsonTest: {
                count: 1
            },
            path: '*'
        });
    });

    it('should not length match any objects in an array with a \'*\' path', function() {
        var fn = function() {
            pm.matchJSONLength({
                jsonBody: fixtures.sameNumbers,
                jsonTest: {
                    count: 999
                },
                path: '*'
            });
        };

        expect(fn).to.throw();
    });

    it('should length match one object in an array with an \'array.?\' path', function() {
        pm.matchJSONLength({
            jsonBody: fixtures,
            jsonTest: {
                count: 1
            },
            path: 'differentNumbers.?'
        });
    });

    it('should not length match one object in an array with an \'array.?\' path', function() {
        var fn = function() {
            pm.matchJSONLength({
                jsonBody: fixtures,
                jsonTest: {
                    count: 999
                },
                path: 'differentNumbers.?'
            });
        };

        expect(fn).to.throw();
    });

    it('should length match all objects in an array with an \'array.*\' path', function() {
        pm.matchJSONLength({
            jsonBody: fixtures,
            jsonTest: {
                count: 1
            },
            path: 'sameNumbers.*'
        });
    });

    it('should not length match any objects in an array with an \'array.*\' path and isNot set', function() {
        pm.matchJSONLength({
            jsonBody: fixtures,
            jsonTest: {
                count: 999
            },
            path: 'sameNumbers.*',
            isNot: true
        });
    });

    it('should not length match any objects in an array with an \'array.*\' path', function() {
        var fn = function() {
            pm.matchJSONLength({
                jsonBody: fixtures,
                jsonTest: {
                    count: 999
                },
                path: 'sameNumbers.*'
            });
        };

        expect(fn).to.throw();
    });

    it('should not length match all objects in an array with a \'*\' path and isNot set', function() {
        var fn = function() {
            pm.matchJSONLength({
                jsonBody: fixtures.sameNumbers,
                jsonTest: {
                    count: 1
                },
                path: '*',
                isNot: true
            });
        };

        expect(fn).to.throw(/Expected all lengths to be invalid but/);
    });

    it('should not length match an empty array with a \'?\' path', function() {
        var fn = function() {
            pm.matchJSONLength({
                jsonBody: [],
                jsonTest: {
                    count: 5
                },
                path: '?'
            });
        };

        expect(fn).to.throw('There are no JSON objects to match against');
    });
});
