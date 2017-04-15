'use strict';

var path = require('path');
var frisby = require('../lib/icedfrisby');

describe('Frisby object setup', function() {

  it('global setup should be empty', function() {
    expect(frisby.globalSetup()).to.deep.equal({
      request: {
        headers: {},
        inspectOnFailure: false,
        json: false,
        baseUri: ''
      }
    });
  });

  it('should have empty request properties on creation', function() {
    var f1 = frisby.create('test 1');

    expect(f1.current.request).to.deep.equal({
      headers: {},
      inspectOnFailure: false,
      json: false,
      baseUri: ''
    });
  });

  it('should be independent of other Frisby objects', function() {
    var f1 = frisby.create('test 1');
    var f2 = frisby.create('test 2');

    // Equal setup
    expect(f1.current.request).to.deep.equal(f2.current.request);

    // Different describe statements
    expect(f1.current.describe).not.to.deep.equal(f2.current.describe);

    // Add header only to f1
    f1.addHeaders({
      'Accept': 'application/json'
    });
    f2.addHeaders({
      'Accept': 'application/x-www-form-urlencoded'
    });

    // Different setup
    expect(f1.current.request).not.to.deep.equal(f2.current.request);
  });

  it('should be able to useApp', function() {
      frisby.globalSetup({
        useApp: require(path.join(__dirname, './app_integration_express/expressApp.js'))
      });

      frisby.create();
  });

   it('should be able to addHeader when global request headers is not configured', function() {
     frisby.globalSetup({
       request: {
         inspectOnFailure: false,
         json: false
       }
     });

     frisby.create('mytest').addHeader('Cookie', 'key=value').reset();
   });

  it('should be able to add and remove headers', function() {
    var f1 = frisby.create('test 1');

    // Add header only to f1
    f1.addHeaders({
      'accept': 'application/json'
    });

    // verify that the header is set correctly
    expect(f1.current.request.headers).to.deep.equal({
        'accept': 'application/json'
    });

    // remove the header
    f1.removeHeader('accept');

    // verify that the header is set correctly
    expect(f1.current.request.headers).to.deep.equal({});
  });

  it('should be overrite headers with the same key', function() {
    var f1 = frisby.create('test 1');

    // Add header only to f1
    f1.addHeaders({
      'accept': 'application/json'
    });

    // verify that the header is set correctly
    expect(f1.current.request.headers).to.deep.equal({
      'accept': 'application/json'
    });

    // Add a new accept header
    f1.addHeaders({
      'accept': 'json'
    });

    // verify that there is only one header
    expect(f1.current.request.headers).to.deep.equal({
      'accept': 'json'
    });
  });

  it('should default to json = false', function() {
    expect(frisby.globalSetup()).to.deep.equal({
      request: {
        headers: {},
        inspectOnFailure: false,
        json: false,
        baseUri: ''
      }
    });

    expect(frisby.create('mytest').get('/path').current.outgoing.json).to.deep.equal(false);
  });

  it('should switch to json default = true when global config is configured json', function() {
    frisby.globalSetup({
      request: {
        headers: {},
        inspectOnFailure: false,
        json: true
      }
    });

    expect(frisby.globalSetup()).to.deep.equal({
      request: {
        baseUri: "",
        headers: {},
        inspectOnFailure: false,
        json: true
      }
    });

    expect(frisby.create('mytest').get('/path').current.outgoing.json).to.deep.equal(true);
  });

  it('should be able to reset the request object with reset()', function() {
      frisby.globalSetup({
          request: {
              headers: { 'X-Stuff': 'stuff header' },
              json: true,
              baseUri: 'https://some.base.url.com/'
          }
      });

      // verify that the global config was set properly
      expect(frisby.globalSetup()).to.deep.equal({
          request: {
              headers: { 'X-Stuff': 'stuff header' },
              json: true,
              baseUri: 'https://some.base.url.com/',
              inspectOnFailure: false
          }
      });

      expect(frisby.create('mytest').reset().current.request).to.deep.equal({
        baseUri: "",
        headers: {},
        inspectOnFailure: false,
        json: false
      });
  });

  it('should be overridable by the params parameter json=false', function() {
    frisby.globalSetup({
      request: {
        headers: {},
        inspectOnFailure: false,
        json: true
      }
    });

    expect(frisby.globalSetup()).to.deep.equal({
      request: {
        headers: {},
        baseUri: "",
        inspectOnFailure: false,
        json: true
      }
    });

    expect(frisby.create('mytest').get('/path', {
      json: false
    }).current.outgoing.json).to.equal(false);
  });

  it('should switch to inspectOnFailure default = true when global config is configured inspectOnFailure', function() {
    frisby.globalSetup({
      request: {
        headers: {},
        inspectOnFailure: true,
        json: false
      }
    });

    expect(frisby.globalSetup()).to.deep.equal({
      request: {
        headers: {},
        baseUri: "",
        inspectOnFailure: true,
        json: false
      }
    });

    expect(frisby.create('mytest').get('/path').current.outgoing.inspectOnFailure).to.deep.equal(true);
  });

  it('should be overridable by the params parameter inspectOnFailure=false', function() {
    frisby.globalSetup({
      request: {
        headers: {},
        inspectOnFailure: true,
        json: false
      }
    });

    expect({
      request: {
        headers: {},
        baseUri: "",
        inspectOnFailure: true,
        json: false
      }
    }).to.deep.equal(frisby.globalSetup());

    expect(frisby.create('mytest').get('/path', {
      inspectOnFailure: false
    }).current.outgoing.inspectOnFailure).to.equal(false);
  });

});
