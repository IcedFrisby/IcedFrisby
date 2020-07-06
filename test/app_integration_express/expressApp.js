/* istanbul ignore next */
'use strict'

const express = require('express')
const app = express()

app.get('/', function (req, res) {
  res.send('Hello World!')
})

/* istanbul ignore next */
// prevent the app from starting if it is required as a module
if (!module.parent) {
  const server = app.listen(3000, function () {
    const host = server.address().address
    const port = server.address().port

    console.log('Example app listening at http://%s:%s', host, port)
  })
}

// export the application
module.exports = app
