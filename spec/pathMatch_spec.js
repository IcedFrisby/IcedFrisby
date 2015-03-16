var pm = require('../lib/pathMatch');
var expect = require('chai').expect;
var Joi = require('joi');

// JSON to use in mock tests
var fixtures = require('./fixtures/repetition_fixture.json');

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

        expect(fn).to.throw(/Expected one out of [0-9]+ objects to match/);
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

        expect(fn).to.throw(/Expected one out of [0-9]+ objects to match/);
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
