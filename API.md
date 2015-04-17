# IcedFrisby API Guide

## Global Setup

`globalSetup()` allows you to define default options for ALL IcedFrisby tests.

:collision: Global setup will affect IcedFrisby tests even across files. It is truly global. Do not call `globalSetup()` more than once unless you know what you are doing.

### request.baseUri
Base URI/URL that will be prepended to every request.
Type: `string`
Default: `''`

```javascript
frisby.globalSetup({
  request: {
    baseUri: 'http://localhost:3000/api/'
  }
});
```

### request.headers
Default headers by providing an object with key-value pairs.
Type: `Object`
Default: `{}`

```javascript
frisby.globalSetup({
  request: {
    headers: { 'Authorization': 'Bearer [...]' }
  }
});
```

### request.json
Sets the `content-type` header to `application/json`.
Type: `boolean`
Default: `false`

```javascript
frisby.globalSetup({
  request: {
    json: true // or false
  }
});
```

### request.inspectOnFailure
This is a really neat option that will help you figure out what is happening with your requests. Dumps request/response information to the logs.
Type: `boolean`
Default: `false`

```javascript
frisby.globalSetup({
  request: {
    inspectOnFailure: true // or false
  }
});
```

### failOnMultiSetup
Enabling the `failOnMultiSetup` option causes IcedFrisby to throw an error if `globalSetup(opts)` is called more than once. We recommend enabling this option. Message:
> IcedFrisby global setup has already been done. Doing so again is disabled (see the failOnMultiSetup option) because it may cause indeterministic behavior.

Type: `boolean`
Default: `false` Disabled by default for compatibility purposes. 

```javascript
frisby.globalSetup({
  request: {
    inspectOnFailure: true // or false
  }
});
```

### Resetting `globalSetup`
Resets the `globalSetup` settings for the current test.

```javascript
frisby.create('Request without the globalSetup options')
  .reset() // reset the globalSetup options
  .get(...)
  ...
```
