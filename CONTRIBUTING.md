# Contributing guidelines

### Code Coverage

You can assess code coverage by running `npm run coverage`.

### Contributions

Contributions are awesome! If you have an idea or code that you want to
contribute, feel free to open an issue or a pull request and we will gladly
review it.

The library is post-1.0 now, so there is backward compatibility and future
maintainability to consider. If you are adding functionality, you can also
write a [plugin](#icedfrisby-plugins) and add a link here.

### Formatting

This project formats its source code using Prettier. The most enjoyable way to
use Prettier is to let it format code for you when you save. You can [integrate
it into your editor][integrate prettier].

If you don't integrate it into your editor, you can run it from the command line
using `npm run prettier`.

[integrate prettier]: https://prettier.io/docs/en/editors.html

### Release process

The procedure for issuing a release is as follows:

1. Edit `package.json` and `CHANGELOG.md`, updating the version and release notes. Ensure no other files have changes.
1. Make a new commit `git commit -am 'RELEASE X.X.X'`
1. Tag the commit `git tag X.X.X`
1. Push commits and tags `git push && git push --tags`
1. Publish to npm `npm publish`

### Writing your own plugin

Writing a plugin for IcedFrisby is easy. For compatibility with other plugins,
use a [subclass factory][]:

```js
const factory = superclass =>
  class MyPlugin extends superclass {
    expectValidXML() {
      this.after((err, res, body) => {
        // ... assert something here ...
      })
      return this
    }
  }
module.exports = factory
```

[subclass factory]: http://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/
