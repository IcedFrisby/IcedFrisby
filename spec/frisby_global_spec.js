var frisby = require('../lib/frisby');

describe('Frisby object setup', function() {

  it('global setup should be empty', function() {
    expect({
      request: {
        headers: {},
        inspectOnFailure: false,
        json: false,
        baseUri: ''
      }
    }).to.deep.equal(frisby.globalSetup());
  });

  it('should have empty request properties on creation', function() {
    var f1 = frisby.create('test 1');

    expect({
      headers: {},
      inspectOnFailure: false,
      json: false,
      baseUri: ''
    }).to.deep.equal(f1.current.request);
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

  it('should default to json = false', function() {
    expect({
      request: {
        headers: {},
        inspectOnFailure: false,
        json: false,
        baseUri: ''
      }
    }).to.deep.equal(frisby.globalSetup());

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

    expect({
      request: {
        headers: {},
        inspectOnFailure: false,
        json: true
      }
    }).to.deep.equal(frisby.globalSetup());

    expect(frisby.create('mytest').get('/path').current.outgoing.json).to.deep.equal(true);
  });

  it('should be overridable by the params parameter json=false', function() {
    frisby.globalSetup({
      request: {
        headers: {},
        inspectOnFailure: false,
        json: true
      }
    });

    expect({
      request: {
        headers: {},
        inspectOnFailure: false,
        json: true
      }
    }).to.deep.equal(frisby.globalSetup());

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

    expect({
      request: {
        headers: {},
        inspectOnFailure: true,
        json: false
      }
    }).to.deep.equal(frisby.globalSetup());

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
        inspectOnFailure: true,
        json: false
      }
    }).to.deep.equal(frisby.globalSetup());

    expect(frisby.create('mytest').get('/path', {
      inspectOnFailure: false
    }).current.outgoing.inspectOnFailure).to.equal(false);
  });

});
