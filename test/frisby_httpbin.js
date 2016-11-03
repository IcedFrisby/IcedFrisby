var frisby = require('../lib/icedfrisby');
var Joi = require('joi');
var fs = require('fs');
var path = require('path');
var util = require('util');
var Readable = require('stream').Readable;
var FormData = require('form-data');

function StringStream(string, options) {
  Readable.call(this, options);
  this.writable = false;
  this.readable = true;
  this.string = string;
}

util.inherits(StringStream, Readable);

StringStream.prototype._read = function (ignore) {
  this.push(this.string);
  this.push(null);
};

/**
 * Tests run like normal Frisby specs but with 'mock' specified with a
 * 'mock-request' object. These work without further 'expects' statements
 * because Frisby generates and runs Jasmine tests
 */
describe('Frisby live running httpbin tests', function () {

  it('should validate basicAuth', function () {

    frisby.create('test with httpbin for valid basic auth')
      .get('http://httpbin.org/basic-auth/frisby/passwd')
      .auth('frisby', 'passwd')
      .expectStatus(200)
      .toss();

  });

  describe('Frisby digestAuth', function () {

    it('should not work if digest not set', function () {

      frisby.create('test with httpbin for invalid digest auth')
        .auth('frisby', 'passwd')
        .get('http://httpbin.org/digest-auth/auth/frisby/passwd')
        .expectStatus(401)
        .toss();

    });

    /*
    // Digest auth against httpbin not working for some reason
    // but working fine against my own servers running digest auth
    it('should work if digest set', function() {
      frisby.create('test with httpbin for valid digest auth')
        .auth('frisby', 'passwd', true)
        .get('http://httpbin.org/digest-auth/auth/frisby/passwd')
        .expectStatus(200)
      .toss();
    });
    */

  });

  it('should pass in param hash to request call dependency', function () {
    frisby.create('test with httpbin for valid basic auth')
      .get('http://httpbin.org/redirect/3', {
        followRedirect: false,
        maxRedirects: 1
      })
      .expectStatus(302)
      .toss();

  });

  it('should patch requests with Buffer and Stream objects.',
    function () {
      var patchCommand = 'Patch me!';

      frisby.create('PATCH via Buffer object')
        .patch('http://httpbin.org/patch',
          new Buffer(patchCommand), {
            json: false,
            headers: {
              'content-type': 'text/plain'
            }
          })
        .expectStatus(200)
        .expectHeaderContains('content-type', 'application/json')
        .expectJSONTypes({
          data: Joi.string().valid(patchCommand.toString()),
          headers: Joi.object().required().keys({
            'Content-Type': Joi.string().required().valid(
              'text/plain'),
            'Content-Length': Joi.string().required().valid('' +
              patchCommand.length),
            Host: Joi.any()
          }),
          args: Joi.any(),
          files: Joi.any(),
          form: Joi.any(),
          json: Joi.any(),
          origin: Joi.any(),
          url: Joi.string().required().valid(
            'http://httpbin.org/patch')
        })
        .toss();

      frisby.create('PATCH via Stream object')
        .patch('http://httpbin.org/patch',
          new StringStream(patchCommand), {
            json: false,
            headers: {
              'content-type': 'text/plain',
              'content-length': String(patchCommand.length)
            }
          })
        .expectStatus(200)
        .expectHeaderContains('content-type', 'application/json')
        .expectJSONTypes({
          data: Joi.string().required().valid(patchCommand.toString()),
          headers: Joi.object().required().keys({
            'Content-Type': Joi.string().required().valid(
              'text/plain'),
            'Content-Length': Joi.string().required().valid('' +
              patchCommand.length),
            Host: Joi.any()
          }),
          args: Joi.any(),
          files: Joi.any(),
          form: Joi.any(),
          json: Joi.any(),
          origin: Joi.any(),
          url: Joi.string().required().valid(
            'http://httpbin.org/patch')
        })
        .toss();

    });

  it('should send binary data via put/post requests with buffer objects',
    function () {

      var data = [];

      for (var i = 0; i < 1024; i++)
        data.push(Math.round(Math.random() * 256));


      frisby.create('POST random binary data via buffer object')
        .post('http://httpbin.org/post',
          new Buffer(data), {
            json: false,
            headers: {
              'content-type': 'application/octet-stream'
            }
          })
        .expectStatus(200)
        .expectHeaderContains('content-type', 'application/json')
        .expectJSONTypes({
          /* use the JSONTypes to check for data and headers. We don't really
             care about anything else. */
          data: Joi.string().valid(
            'data:application/octet-stream;base64,' + new Buffer(
              data).toString('base64')),
          headers: Joi.object().required().keys({
            'Content-Type': Joi.string().required().valid(
              'application/octet-stream'),
            'Content-Length': Joi.string().required().valid('1024'),
            Host: Joi.any()
          }),
          args: Joi.any(),
          files: Joi.any(),
          form: Joi.any(),
          json: Joi.any(),
          origin: Joi.any(),
          url: Joi.string().required().valid('http://httpbin.org/post')
        })
        .toss();

      frisby.create('PUT random binary data via Buffer object')
        .put('http://httpbin.org/put', new Buffer(data), {
          json: false,
          headers: {
            'content-type': 'application/octet-stream'
          }
        })
        .expectStatus(200)
        .expectHeaderContains('content-type', 'application/json')
        .expectJSONTypes({
          data: Joi.string().required().valid(
            'data:application/octet-stream;base64,' +
            new Buffer(data).toString('base64')),
          headers: Joi.object().keys({
            'Content-Type': Joi.string().required().valid(
              'application/octet-stream'),
            'Content-Length': Joi.string().required().valid('1024'),
            Host: Joi.any()
          }),
          args: Joi.any(),
          files: Joi.any(),
          form: Joi.any(),
          json: Joi.any(),
          origin: Joi.any(),
          url: Joi.string().required().valid('http://httpbin.org/put')
        })
        .toss();

    });

  it('should send binary data via put/post requests with stream objects',
    function () {
      var filePath = path.resolve(__dirname, './logo-frisby.png');
      var fileSize = fs.statSync(filePath).size;
      var fileContent = fs.readFileSync(filePath);

      /*
       * NOTE:
       * Using a Stream with httpbin.org requires to set the Content-Length
       * header to not use chunked HTTP transfer. When chunked httpbin does
       * return an empty data field. However not setting the Content-Length
       */

      frisby.create(
          'POST frisby logo to http://httpbin.org/post using a Stream')
        .post('http://httpbin.org/post',
          fs.createReadStream(filePath), {
            json: false,
            headers: {
              'content-type': 'application/octet-stream',
              'content-length': fileSize
            }
          })
        .expectStatus(200)
        .expectHeaderContains('content-type', 'application/json')
        .expectJSONTypes({
          data: Joi.string().required().valid(
            'data:application/octet-stream;base64,' + fileContent.toString(
              'base64')),
          headers: Joi.object().required().keys({
            'Content-Type': Joi.string().valid(
              'application/octet-stream'),
            'Content-Length': Joi.string().valid('' + fileSize),
            Host: Joi.any()
          }),
          args: Joi.any(),
          files: Joi.any(),
          form: Joi.any(),
          json: Joi.any(),
          origin: Joi.any(),
          url: Joi.string().required().valid('http://httpbin.org/post'),
        })
        .toss();

      frisby.create(
          'PUT frisby logo to http://httpbin.org/put using a Stream')
        .put('http://httpbin.org/put',
          fs.createReadStream(filePath), {
            json: false,
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Length': fileSize
            }
          })
        .expectStatus(200)
        .expectHeaderContains('content-type', 'application/json')
        .expectJSONTypes({
          data: Joi.string().valid(
            'data:application/octet-stream;base64,' + fileContent.toString(
              'base64')),
          headers: Joi.object().keys({
            'Content-Type': Joi.string().valid(
              'application/octet-stream'),
            'Content-Length': Joi.string().valid('' + fileSize),
            Host: Joi.any()
          }),
          args: Joi.any(),
          files: Joi.any(),
          form: Joi.any(),
          json: Joi.any(),
          origin: Joi.any(),
          url: Joi.string().valid('http://httpbin.org/put'),
        })
        .toss();
    });

  it('should send multipart/from-data encoded bodies', function () {
    var logoPath = path.resolve(__dirname, '../test/logo-frisby.png');
    var binaryData = [0xDE, 0xCA, 0xFB, 0xAD];

    function makeFormData() {
      var form = new FormData();

      form.append('field_a', 'A');
      form.append('field_b', 'B');
      // using Buffers pass a filename to make form-data set the content-type
      form.append('buffer', new Buffer(binaryData), {
        contentType: 'application/octet-stream',
        filename: 'test.bin'
      });
      // set the knownLength so we can call form.getLengthSync()
      form.append('file_1', fs.createReadStream(logoPath), {
        knownLength: fs.statSync(logoPath).size
      });
      form.append('file_2', fs.createReadStream(__filename), {
        knownLength: fs.statSync(__filename).size
      });
      return form;
    }

    var form = makeFormData();
    frisby.create('POST frisby logo to http://httpbin.org/post')
      .post('http://httpbin.org/post',
        form, {
          json: false,
          headers: {
            'content-type': 'multipart/form-data; boundary=' + form.getBoundary(),
            'content-length': form.getLengthSync()
          }
        })
      .expectStatus(200)
      .expectHeaderContains('content-type', 'application/json')
      .expectJSONTypes(Joi.object().keys({
        args: Joi.object(),
        data: Joi.string().allow(''),
        headers: Joi.object().keys({
          'Content-Type': Joi.string().valid(
            'multipart/form-data; boundary=' + form.getBoundary()
          ),
          'Content-Length': Joi.number().min(19000).max(23000),
          Host: Joi.string().hostname().valid('httpbin.org')
        }),
        url: Joi.string().uri({
          scheme: ['http']
        }).valid('http://httpbin.org/post'),
        origin: Joi.string().ip({
          scheme: ['ipv4']
        }),
        json: Joi.string().allow(null),
        files: Joi.object().keys({
          buffer: Joi.string().valid(
            'data:application/octet-stream;base64,' + new Buffer(
              binaryData).toString('base64')),
          file_1: Joi.string().valid('data:image/png;base64,' +
            fs
            .readFileSync(
              logoPath).toString('base64')),
          file_2: Joi.string().valid(fs.readFileSync(
            __filename).toString())
        }),
        form: Joi.object().keys({
          field_a: Joi.string().valid('A'),
          field_b: Joi.string().valid('B')
        })
      }))
      .toss();

    form = makeFormData();
    frisby.create('PUT frisby logo to http://httpbin.org/post')
      .put('http://httpbin.org/put',
        form, {
          json: false,
          headers: {
            'content-type': 'multipart/form-data; boundary=' + form.getBoundary(),
            'content-length': form.getLengthSync()
          }
        })
      .expectStatus(200)
      .expectHeaderContains('content-type', 'application/json')
      .expectJSONTypes(Joi.object().keys({
        args: Joi.object(),
        data: Joi.string().allow(''),
        headers: Joi.object().keys({
          'Content-Type': Joi.string().valid(
            'multipart/form-data; boundary=' + form.getBoundary()
          ),
          'Content-Length': Joi.number().min(19000).max(23000),
          Host: Joi.string().hostname().valid('httpbin.org')
        }),
        url: Joi.string().uri({
          scheme: ['http']
        }).valid('http://httpbin.org/put'),
        origin: Joi.string().ip({
          scheme: ['ipv4']
        }),
        json: Joi.string().allow(null),
        files: Joi.object().keys({
          buffer: Joi.string().valid(
            'data:application/octet-stream;base64,' + new Buffer(
              binaryData).toString('base64')),
          file_1: Joi.string().valid('data:image/png;base64,' +
            fs
            .readFileSync(
              logoPath).toString('base64')),
          file_2: Joi.string().valid(fs.readFileSync(
            __filename).toString())
        }),
        form: Joi.object().keys({
          field_a: Joi.string().valid('A'),
          field_b: Joi.string().valid('B')
        })
      }))
      .toss();

    form = makeFormData();
    frisby.create('PATCH frisby logo to http://httpbin.org/post')
      .patch('http://httpbin.org/patch',
        form, {
          json: false,
          headers: {
            'content-type': 'multipart/form-data; boundary=' + form.getBoundary(),
            'content-length': form.getLengthSync()
          }
        })
      .expectStatus(200)
      .expectHeaderContains('content-type', 'application/json')
      .expectJSONTypes(Joi.object().keys({
        args: Joi.object(),
        data: Joi.string().allow(''),
        headers: Joi.object().keys({
          'Content-Type': Joi.string().valid(
            'multipart/form-data; boundary=' + form.getBoundary()
          ),
          'Content-Length': Joi.number().min(19000).max(23000),
          Host: Joi.string().hostname().valid('httpbin.org')
        }),
        url: Joi.string().uri({
          scheme: ['http']
        }).valid('http://httpbin.org/patch'),
        origin: Joi.string().ip({
          scheme: ['ipv4']
        }),
        json: Joi.string().allow(null),
        files: Joi.object().keys({
          buffer: Joi.string().valid(
            'data:application/octet-stream;base64,' + new Buffer(
              binaryData).toString('base64')),
          file_1: Joi.string().valid('data:image/png;base64,' +
            fs
            .readFileSync(
              logoPath).toString('base64')),
          file_2: Joi.string().valid(fs.readFileSync(
            __filename).toString())
        }),
        form: Joi.object().keys({
          field_a: Joi.string().valid('A'),
          field_b: Joi.string().valid('B')
        })
      }))
      .toss();
  })

  it('should validate OPTIONS, HEAD, and DELETE methods', function () {

    frisby.create('DELETE using httpbin')
      .delete('http://httpbin.org/delete')
      .expectStatus(200)
      .expectJSONTypes(Joi.object().keys({
        args: Joi.object(),
        data: Joi.string().allow(''),
        files: Joi.object(),
        form: Joi.object(),
        headers: Joi.object().keys({
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Joi.number().valid(0),
          'Host': Joi.string().hostname().valid('httpbin.org'),
        }),
        url: Joi.string().uri({
          scheme: ['http']
        }).valid('http://httpbin.org/delete'),
        origin: Joi.string().ip({
          scheme: ['ipv4']
        }),
        json: Joi.string().allow(null),
      }))
      .toss();

    frisby.create('HEAD using httpbin')
      .head('http://httpbin.org')
      .expectHeaderContains('Content-Type', 'text/html; charset=utf-8')
      .expectStatus(200)
      .toss();

    frisby.create('OPTIONS using httpbin')
      .options('http://httpbin.org')
      .expectHeaderContains('Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, PATCH, OPTIONS')
      .expectStatus(200)
      .toss();
  })

  it('should validate afterJSON() function', function () {
    frisby.create('validate afterJSON function')
      .delete('http://httpbin.org/delete')
      .expectStatus(200)
      .afterJSON(function(json) {
        expect(json.url).to.equal('http://httpbin.org/delete')
      })
      .toss();
  })



});
