# transform.js

Transform.js is a gulpfile.js generator, automatically creating per-file gulp tasks.

# Installing

```
bash$ npm install -g transform.js
```

# Using

Transformations are specific to each source file, and only source files with a transformation specified are built and copied to the output directory.  Say, in a file called 'sample.js', I have code like:

```
//%
//% react |> print
//%

window.addEventListener('load', () => {
  ReactDOM.render(<div>Hello World!</div>, document.body)
})
```

This specifies that I wish to pipe this file through a said `react` transformer, and then a so-called `print` transformer.  Transformers are specified by exported functions that return a stream, declared in a file `transform.js`, in the same directory as `gulpfile.js`.

The `transform.js` file for this example might look like:

```
'use strict'
const react = require('gulp-react')
const print = require('gulp-print')

module.exports.react = function() {
  return react()
}

module.exports.print = function() {
    return print()
}
```

I may then generate `gulpfile.js` by typing:

```
bash$ tjs > gulpfile.js
```
