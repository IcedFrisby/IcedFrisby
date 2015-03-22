var nock = require('nock');
var frisby = require('../lib/icedfrisby');

//
// This spec tests and showcases the dev-friendy output features of IcedFrisby
//

// Test global setup
var defaultGlobalSetup = frisby.globalSetup();
var mockGlobalSetup = function() {
    frisby.globalSetup({
        timeout: 3000,
        request: {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Referer': 'http://frisbyjs.com'
            }
        }
    });
};
var restoreGlobalSetup = function() {
    frisby.globalSetup(defaultGlobalSetup);
};

describe('console output', function() {
    it('should warn developers if there is a header with \'json\' but the body type is not JOSN', function() {
        // Mock API
        nock('http://mock-request/', {
                allowUnmocked: true
            })
            .post('/test-object')
            .once()
            .reply(201, function(uri, requestBody) {
                return requestBody;
            });

        mockGlobalSetup();

        frisby.create(this.test.title)
            .post('http://mock-request/test-object', {
                isSomeObj: true
            })
            .expectStatus(201)
            .toss();

        // TODO: come up with a good way to capture console output and actually check it
    });

    it('should NOT warn developers that "there is a header with \'json\' but the body type is not JOSN" because there is no body provided', function() {
        // Mock API
        nock('http://mock-request/', {
                allowUnmocked: true
            })
            .post('/test-object')
            .once()
            .reply(201, function(uri, requestBody) {
                return requestBody;
            });

        mockGlobalSetup();

        frisby.create(this.test.title)
            .post('http://mock-request/test-object')
            .expectStatus(201)
            .toss();

        // TODO: come up with a good way to capture console output and actually check it
    });
});
