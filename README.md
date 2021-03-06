# transform.js

Transform.js is a gulpfile generator, automatically creating per-file gulp tasks by looking for special comments in source files.

# Installing

```
npm install -g transform.js
```

# Use

Suppose your project tree looks like the following:

```
app/
  public/
    css/main.less # we want to transform this to CSS
    js/
      jquery/     # we don't want to touch this one
      app.js      # we want to transform this with webpack
  server.js       # we want to leave this file untouched
```

In order to generate the gulpfile for this project, we just need to provide content-type 'hints' to transform.js  This is done with the special comment suffix `%` anywhere in the file.  For example, in our LESS file, we would leave a comment like:

```
/*% less */
...your LESS code...
```

This adds the content-type hint `less` to this file.  Transform.js will generate a gulp task equivalent (at least similar) to the following:

```
gulp.task('public/css/main.less', function() {
    let pipe = gulp.src('public/css/main.less')
    pipe = pipe.pipe(YOUR_TRANSFORM_MODULE.less.call(pipe))
    return pipe
})
```

`YOUR_TRANSFORM_MODULE` is a module in the file `transform.js` (in the same directory as `gulpfile.js`; it is assumed this file exists) that exports transformations in the form of gulp-streams.

# transform.js file

The `transform.js` file for this example might look like:

```
'use strict'
const less = require('gulp-less')

module.exports.less = function() {
  return this.pipe(less())
    .pipe(gulp.dest('.build'))
}
```

There are a few important things to note:

* the current stream is passed to each transformer through the `this` context
* each transformer name must match the one specified in the content-type hint
* there are a few "magic" transformers that you may define:
  1. `start` - files are piped through this transformer before anything else
  2. `finish` - files are piped through this transformer after all other pipes
  3. `each` - files are piped through this transformer after each named transform
  4. `blank` - any file with no content-type hint specified (say, with an empty content-type hint comment, such as `//%`) is passed through this transformer.  Useful for files which you only want to copy to the output directory.

# Getting Fancy

## Passing Options to Transformers

You may specify arguments to pass to each transformer in your content-type hint comment.  Say I have an example JavaScript file that I want to transform using file-specific options.  The content-type hint might look like:

```
//% babel({
//%   myOption: 'somePreference'
//% })
```

The corresponding transformer in `transform.js` will receive this object in the following way:

```
module.exports.babel = function(opts) {
  // use `opts.myOption`
  return this.pipe(...)
}
```

## Specifying Multiple Transformers

Multiple transformers may be specified in the content-type hint comment as well, using the "pipe" operator `|>`:

```
//% react |> babel
```

This will generate a gulp task equivalent (at least similar to) the following:

```
gulp.task('the-file-name.js', function() {
  return gulp.src('the-file-name.js')
    .pipe(YOUR_TRANSFORM_MODULE.react())
    .pipe(YOUR_TRANSFORM_MODULE.babel())
})
```

## Adding your own Gulp tasks

Export a function `tasks(gulp)` from `transform.js`.  For example:

```
// File: transform.js

module.exports.tasks = function(gulp) {
  gulp.task('my-task', function() {
    // ...
  })
}

```

# Generating a gulpfile

You generate a gulpfile with transform.js by typing:

```
tjs > gulpfile.js
```

## Additionally Generated Gulp Tasks

A few other gulp tasks are generated by default:

* `default` - builds all files with a content-type hint comment specified; also tries to return the stream generated by `YOUR_TRANSFORM_MODULE.default([done_callback])` (if this method exists; this is useful if you want to extend the default task)
* `watch` - watches all files with a content-type hint comment specified
* `clean` - Tries to call `YOUR_TRANSFORM_MODULE.clean(done_callback)`

# How is this intended to be used?

I wrote this utility because I wanted a build system for my projects where I could specify in each file what transformation I wanted it to undergo, and then dump all of the files to an output directory (say, `.build`) that would be ready to deploy in all environments.  Each time I added a new file, I could "register it with the project" by regenerating a new gulpfile, and then restart it with `gulp watch`.

This project is still in very early stages, and I am still developing/stabilizing it.

# LICENSE

## ISC License (ISC)
Copyright (c) 2015, Jonathan Apodaca

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
