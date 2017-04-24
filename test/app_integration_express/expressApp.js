/* istanbul ignore next */
'use strict'

var express = require('express')
var app = express()

app.get('/', function(req, res) {
  res.send('Hello World!')
})

/* istanbul ignore next */
// prevent the app from starting if it is required as a module
if (!module.parent) {
  var server = app.listen(3000, function() {

    var host = server.address().address
    var port = server.address().port

    console.log('Example app listening at http://%s:%s', host, port)

  })
}

// export the application
module.exports = app
