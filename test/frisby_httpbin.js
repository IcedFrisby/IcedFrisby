'use strict'

const fs = require('fs')
const path = require('path')
const util = require('util')
const Readable = require('stream').Readable
const Joi = require('@hapi/joi')
const sinon = require('sinon')
const chai = require('chai')
const frisby = require('../lib/icedfrisby')

chai.use(require('sinon-chai'))
chai.use(require('dirty-chai'))
const { expect } = chai

function StringStream(string, options) {
  Readable.call(this, options)

  this.writable = false
  this.readable = true
  this.string = string
}
util.inherits(StringStream, Readable)

StringStream.prototype._read = function(ignore) {
  this.push(this.string)
  this.push(null)
}

//
// Tests run like normal Frisby specs but with 'mock' specified with a 'mock-request' object
// These work without further 'expects' statements because Frisby generates and runs Jasmine tests
//
describe('Frisby live running httpbin tests', function() {
  it('Frisby basicAuth should work', async function() {
    await frisby
      .create('test with httpbin for valid basic auth')
      .get('http://httpbin.org/basic-auth/frisby/passwd')
      .auth('frisby', 'passwd')
      .expectStatus(200)
      .run()
  })

  describe('Frisby digestAuth', function() {
    it('should not work if digest not set', async function() {
      await frisby
        .create('test with httpbin for invalid digest auth')
        .auth('frisby', 'passwd')
        .get('http://httpbin.org/digest-auth/auth/frisby/passwd')
        .expectStatus(401)
        .run()
    })

    // Digest auth against httpbin not working for some reason
    // but working fine against my own servers running digest auth
    it('should work if digest set', async function() {
      await frisby
        .create('test with httpbin for valid digest auth')
        .auth('frisby', 'passwd', true)
        .get('http://httpbin.org/digest-auth/auth/frisby/passwd')
        .expectStatus(200)
        .run()
    })
  })

  it('should pass in param hash to request call dependency', async function() {
    const onJsonReviver = sinon.spy()

    await frisby
      .create('test with httpbin for valid basic auth')
      .get('http://httpbin.org/json', {
        json: true,
        jsonReviver: data => {
          onJsonReviver()
          return JSON.parse(data)
        },
      })
      .expectStatus(200)
      .run()

    expect(onJsonReviver).to.be.calledOnce()
  })

  it('sending binary data via put or post requests using Buffer objects should work', async function() {
    const data = []

    for (let i = 0; i < 1024; i++) data.push(Math.round(Math.random() * 256))

    await frisby
      .create('POST random binary data via Buffer object')
      .post('https://httpbin.org/post', Buffer.from(data), {
        json: false,
        headers: { 'content-type': 'application/octet-stream' },
      })
      .expectStatus(200)
      .expectHeaderContains('content-type', 'application/json')
      .expectJSONTypes({
        // use the JSONTypes to check for data and headers. We don't really care about anything else.
        data: Joi.string().valid(
          'data:application/octet-stream;base64,' +
            Buffer.from(data).toString('base64')
        ),
        headers: Joi.object()
          .required()
          .keys({
            Accept: Joi.any(),
            'Accept-Encoding': Joi.any(),
            'Cache-Control': Joi.any(),
            Connection: Joi.any(),
            'Content-Type': Joi.string()
              .required()
              .valid('application/octet-stream'),
            'Content-Length': Joi.string()
              .required()
              .valid('1024'),
            Host: Joi.any(),
            'X-Amzn-Trace-Id': Joi.any(),
          }),
        args: Joi.any(),
        files: Joi.any(),
        form: Joi.any(),
        json: Joi.any(),
        origin: Joi.any(),
        url: Joi.string()
          .required()
          .valid('https://httpbin.org/post'),
      })
      .run()

    await frisby
      .create('PUT random binary data via Buffer object')
      .put('https://httpbin.org/put', Buffer.from(data), {
        json: false,
        headers: { 'content-type': 'application/octet-stream' },
      })
      .expectStatus(200)
      .expectHeaderContains('content-type', 'application/json')
      .expectJSONTypes({
        data: Joi.string()
          .required()
          .valid(
            'data:application/octet-stream;base64,' +
              Buffer.from(data).toString('base64')
          ),
        headers: Joi.object().keys({
          Accept: Joi.any(),
          'Accept-Encoding': Joi.any(),
          'Cache-Control': Joi.any(),
          Connection: Joi.any(),
          'Content-Type': Joi.string()
            .required()
            .valid('application/octet-stream'),
          'Content-Length': Joi.string()
            .required()
            .valid('1024'),
          Host: Joi.any(),
          'X-Amzn-Trace-Id': Joi.any(),
        }),
        args: Joi.any(),
        files: Joi.any(),
        form: Joi.any(),
        json: Joi.any(),
        origin: Joi.any(),
        url: Joi.string()
          .required()
          .valid('https://httpbin.org/put'),
      })
      .run()
  })

  it('PATCH requests with Buffer and Stream objects should work.', async function() {
    const patchCommand = 'Patch me!'

    await frisby
      .create('PATCH via Buffer object')
      .patch('https://httpbin.org/patch', Buffer.from(patchCommand), {
        json: false,
        headers: {
          'content-type': 'text/plain',
        },
      })
      .expectStatus(200)
      .expectHeaderContains('content-type', 'application/json')
      .expectJSONTypes({
        data: Joi.string().valid(patchCommand.toString()),
        headers: Joi.object()
          .required()
          .keys({
            Accept: Joi.any(),
            'Accept-Encoding': Joi.any(),
            Connection: Joi.any(),
            'Content-Type': Joi.string()
              .required()
              .valid('text/plain'),
            'Content-Length': Joi.string()
              .required()
              .valid('' + patchCommand.length),
            Host: Joi.any(),
            'X-Amzn-Trace-Id': Joi.any(),
          }),
        args: Joi.any(),
        files: Joi.any(),
        form: Joi.any(),
        json: Joi.any(),
        origin: Joi.any(),
        url: Joi.string()
          .required()
          .valid('https://httpbin.org/patch'),
      })
      .run()

    await frisby
      .create('PATCH via Stream object')
      .patch('https://httpbin.org/patch', new StringStream(patchCommand), {
        json: false,
        headers: {
          'content-type': 'text/plain',
          'content-length': String(patchCommand.length),
        },
      })
      .expectStatus(200)
      .expectHeaderContains('content-type', 'application/json')
      .expectJSONTypes({
        data: Joi.string()
          .required()
          .valid(patchCommand.toString()),
        headers: Joi.object()
          .required()
          .keys({
            Accept: Joi.any(),
            'Accept-Encoding': Joi.any(),
            Connection: Joi.any(),
            'Content-Type': Joi.string()
              .required()
              .valid('text/plain'),
            'Content-Length': Joi.string()
              .required()
              .valid('' + patchCommand.length),
            Host: Joi.any(),
            'X-Amzn-Trace-Id': Joi.any(),
          }),
        args: Joi.any(),
        files: Joi.any(),
        form: Joi.any(),
        json: Joi.any(),
        origin: Joi.any(),
        url: Joi.string()
          .required()
          .valid('https://httpbin.org/patch'),
      })
      .run()
  })

  it('sending binary data via put or post requests using Stream objects should work', async function() {
    const filePath = path.resolve(__dirname, './logo-frisby.png')
    const fileSize = fs.statSync(filePath).size
    const fileContent = fs.readFileSync(filePath)

    /*
     * NOTE: Using a Stream with httpbin.org requires to set the Content-Length
     *      header to not use chunked HTTP transfer. When chunked httpbin does
     *      return an empty data field. However not setting the Content-Length
     */

    await frisby
      .create('POST frisby logo to https://httpbin.org/post using a Stream')
      .post('https://httpbin.org/post', fs.createReadStream(filePath), {
        json: false,
        headers: {
          'content-type': 'application/octet-stream',
          'content-length': fileSize,
        },
      })
      .expectStatus(200)
      .expectHeaderContains('content-type', 'application/json')
      .expectJSONTypes({
        data: Joi.string()
          .required()
          .valid(
            'data:application/octet-stream;base64,' +
              fileContent.toString('base64')
          ),
        headers: Joi.object()
          .required()
          .keys({
            Accept: Joi.any(),
            'Accept-Encoding': Joi.any(),
            'Cache-Control': Joi.any(),
            Connection: Joi.any(),
            'Content-Type': Joi.string().valid('application/octet-stream'),
            'Content-Length': Joi.string().valid('' + fileSize),
            Host: Joi.any(),
            'X-Amzn-Trace-Id': Joi.any(),
          }),
        args: Joi.any(),
        files: Joi.any(),
        form: Joi.any(),
        json: Joi.any(),
        origin: Joi.any(),
        url: Joi.string()
          .required()
          .valid('https://httpbin.org/post'),
      })
      .run()

    await frisby
      .create('PUT frisby logo to https://httpbin.org/put using a Stream')
      .put('https://httpbin.org/put', fs.createReadStream(filePath), {
        json: false,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileSize,
        },
      })
      .expectStatus(200)
      .expectHeaderContains('content-type', 'application/json')
      .expectJSONTypes({
        data: Joi.string().valid(
          'data:application/octet-stream;base64,' +
            fileContent.toString('base64')
        ),
        headers: Joi.object().keys({
          Accept: Joi.any(),
          'Accept-Encoding': Joi.any(),
          'Cache-Control': Joi.any(),
          Connection: Joi.any(),
          'Content-Type': Joi.string().valid('application/octet-stream'),
          'Content-Length': Joi.string().valid('' + fileSize),
          Host: Joi.any(),
          'X-Amzn-Trace-Id': Joi.any(),
        }),
        args: Joi.any(),
        files: Joi.any(),
        form: Joi.any(),
        json: Joi.any(),
        origin: Joi.any(),
        url: Joi.string().valid('https://httpbin.org/put'),
      })
      .run()
  })

  // it('sending multipart/from-data encoded bodies should work', function () {
  //
  //   var logoPath = path.resolve(__dirname, '../spec/logo-frisby.png');
  //
  //   var binaryData = [0xDE, 0xCA, 0xFB, 0xAD];
  //
  //   function makeFormData() {
  //     var form = new FormData();
  //
  //     form.append('field_a', 'A');
  //     form.append('field_b', 'B');
  //
  //     form.append('buffer', new Buffer(binaryData), {
  //       contentType: 'application/octet-stream',
  //       filename: 'test.bin'               // using Buffers, we need to pass a filename to make form-data set the content-type
  //     });
  //
  //     form.append('file_1', fs.createReadStream(logoPath), {
  //       knownLength: fs.statSync(logoPath).size         // we need to set the knownLength so we can call  form.getLengthSync()
  //     });
  //
  //     form.append('file_2', fs.createReadStream(__filename), {
  //       knownLength: fs.statSync(__filename).size       // we need to set the knownLength so we can call  form.getLengthSync()
  //     });
  //     return form;
  //   }
  //
  //   var form = makeFormData();
  //
  //   frisby.create('POST frisby logo to http://httpbin.org/post')
  //     .post('http://httpbin.org/post',
  //     form,
  //     {
  //       json: false,
  //       headers: {
  //         'content-type': 'multipart/form-data; boundary=' + form.getBoundary(),
  //         'content-length': form.getLengthSync()
  //       }
  //     })
  //     .expectStatus(200)
  //     .expectHeaderContains('content-type', 'application/json')
  //     .expectJSON({
  //       data: '', // empty, data is returned in the files and form propierties
  //       headers: {
  //         "Content-Type": 'multipart/form-data; boundary=' + form.getBoundary()
  //       },
  //       url: 'http://httpbin.org/post',
  //       json: null,
  //       files: {
  //         buffer: 'data:application/octet-stream;base64,' + new Buffer(binaryData).toString('base64'),
  //         file_1: 'data:image/png;base64,' + fs.readFileSync(logoPath).toString('base64'),
  //         file_2: fs.readFileSync(__filename).toString()
  //       },
  //       form: {
  //         field_a: 'A',
  //         field_b: 'B'
  //       }
  //     })
  //     .expectJSONTypes({
  //       data: String,
  //       form: {
  //         field_a: String,
  //         field_b: String
  //       },
  //       files: {
  //         buffer: String,
  //         file_1: String,
  //         file_2: String
  //       }
  //     })
  //     .toss();
  //
  //   form = makeFormData();  // FormData is a Stream and it has been consumed!
  //
  //   frisby.create('PUT frisby logo to http://httpbin.org/post')
  //     .put('http://httpbin.org/put',
  //     form,
  //     {
  //       json: false,
  //       headers: {
  //         'content-type': 'multipart/form-data; boundary=' + form.getBoundary(),
  //         'content-length': form.getLengthSync()
  //       }
  //     })
  //     .expectStatus(200)
  //     .expectHeaderContains('content-type', 'application/json')
  //     .expectJSON({
  //       data: '', // empty, data is returned in the files and form propierties
  //       headers: {
  //         "Content-Type": 'multipart/form-data; boundary=' + form.getBoundary()
  //       },
  //       url: 'http://httpbin.org/put',
  //       json: null,
  //       files: {
  //         buffer: 'data:application/octet-stream;base64,' + new Buffer(binaryData).toString('base64'),
  //         file_1: 'data:image/png;base64,' + fs.readFileSync(logoPath).toString('base64'),
  //         file_2: fs.readFileSync(__filename).toString()
  //       },
  //       form: {
  //         field_a: 'A',
  //         field_b: 'B'
  //       }
  //     })
  //     .expectJSONTypes({
  //       data: String,
  //       form: {
  //         field_a: String,
  //         field_b: String
  //       },
  //       files: {
  //         buffer: String,
  //         file_1: String,
  //         file_2: String
  //       }
  //     })
  //     .toss();
  //
  //   form = makeFormData();  // FormData is a Stream and it has been consumed!
  //
  //   frisby.create('PATCH frisby logo to http://httpbin.org/post')
  //     .patch('http://httpbin.org/patch',
  //     form,
  //     {
  //       json: false,
  //       headers: {
  //         'content-type': 'multipart/form-data; boundary=' + form.getBoundary(),
  //         'content-length': form.getLengthSync()
  //       }
  //     })
  //     .expectStatus(200)
  //     .expectHeaderContains('content-type', 'application/json')
  //     .expectJSON({
  //       data: '', // empty, data is returned in the files and form propierties
  //       headers: {
  //         "Content-Type": 'multipart/form-data; boundary=' + form.getBoundary()
  //       },
  //       url: 'http://httpbin.org/patch',
  //       json: null,
  //       files: {
  //         buffer: 'data:application/octet-stream;base64,' + new Buffer(binaryData).toString('base64'),
  //         file_1: 'data:image/png;base64,' + fs.readFileSync(logoPath).toString('base64'),
  //         file_2: fs.readFileSync(__filename).toString()
  //       },
  //       form: {
  //         field_a: 'A',
  //         field_b: 'B'
  //       }
  //     })
  //     .expectJSONTypes({
  //       data: String,
  //       form: {
  //         field_a: String,
  //         field_b: String
  //       },
  //       files: {
  //         buffer: String,
  //         file_1: String,
  //         file_2: String
  //       }
  //     })
  //     .toss();
  //
  // })

  it('should send all headers when you bootstrap them with config', async function() {
    await frisby
      .create(this.test.title)
      .baseUri('http://httpbin.org')
      .config({ request: { headers: { Abc: 'def' } } })
      .get('/headers')
      .addHeader('Foo', 'bar')
      .expectContainsJSON('headers', {
        Abc: 'def',
      })
      .expectContainsJSON('headers', {
        Foo: 'bar',
      })
      .run()
  })

  it('should send all headers when you bootstrap them with parameters', async function() {
    await frisby
      .create(this.test.title)
      .baseUri('http://httpbin.org')
      .get('/headers', { headers: { Abc: 'def' } })
      .addHeader('Foo', 'bar')
      .expectContainsJSON('headers', {
        Abc: 'def',
      })
      .expectContainsJSON('headers', {
        Foo: 'bar',
      })
      .run()
  })

  it('should respect overridden headers - params > config', async function() {
    await frisby
      .create(this.test.title)
      .baseUri('http://httpbin.org')
      .config({ request: { headers: { a: '1', b: '1' } } })
      .get('/headers', { headers: { a: '2' } })
      .expectContainsJSON('headers', {
        A: '2',
        B: '1',
      })
      .run()
  })

  // Doesn't currently pass, not sure it should. TBC in conversation on #106.
  it.skip('should respect overridden headers - addHeader > params', async function() {
    await frisby
      .create(this.test.title)
      .baseUri('http://httpbin.org')
      .get('/headers', { headers: { a: '1', b: '1' } })
      .addHeader('a', '2')
      .expectContainsJSON('headers', {
        A: '2',
        B: '1',
      })
      .run()
  })
})
