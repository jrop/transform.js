#!/usr/bin/env node
'use strict'

const co = require('co')
const globby = require('globby')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

//
// Parse a file and look for the 'transform' directive
//
const tjs_parseSourceFile = fname => new Promise((yes, no) => {
	let foundLine = false
	let cfg = ''

	let rl = readline.createInterface({
		input: fs.createReadStream(path.join(process.cwd(), fname))
	})
	.on('line', line => {
		let m = null
		if ((m = line.match(/^\s*\/\/%(\s+(.*))?$/))) { // match: //%
			cfg += m[2] || ''
			foundLine = true
		} else if ((m = line.match(/^\s*\/\*%(\s+(.*))?\*\/$/))) { // match: /*% */
			cfg += m[2] || ''
			foundLine = true
		}
	})
	.on('close', () => {
		// console.log('CFG', fname, foundLine, cfg)
		cfg = cfg.split('|>')
			.map(t => t.trim())
			.filter(t => t != '')
			.map(t => t[t.length - 1] != ')' ? t + '()' : t) // add trailing parens (if necessary)
			.map(t => {
				// parse 'some_method(some_parameters)' as { name: 'some_method', argsTuple: '(some_parameters)'}
				let parts = t.match(/^([^\(]+)(.*)$/m)
				let name = parts[1]
				let argsTuple = parts[2]
				return { name, argsTuple }
			})

		yes({ file: fname, transforms: !foundLine ? false : cfg })
	})
})

//
// Generate gulp subscript to transform an individual file based on it's header-spec
//
function tjs_gulp_transformFile(file) {
	// console.log(file)
	return `gulp.task('${file.file}', function() {
	let pipe = gulp.src('${file.file}', { base: __dirname })

	// pre-piping
	if (typeof __t.start == 'function')
		pipe = pipe.pipe(__t.start.bind(pipe)())

	${file.transforms.length == 0 ? `if (typeof __t.blank == 'function') pipe = __t.blank.bind(pipe)()` : ''}

	${file.transforms.map(t => `// pipe setup for ${t.name}
	pipe = __t.${t.name}.bind(pipe)${t.argsTuple}
	if (typeof __t.each == 'function') pipe = pipe.pipe(__t.each.bind(pipe)())`).join('\n\t')}

	// post-piping
	if (typeof __t.finish == 'function')
		pipe = pipe.pipe(__t.finish.bind(pipe)())
	
	return pipe
})`
}

//
// Main
//
co(function*main() {
	try {
		let cwd = process.cwd()
		let files = yield globby([
			'**/*.js',
			'**/*.less',
			'!node_modules/*',
			'!node_modules/**/*',
			'!.tjs/**/*'
		], {
			cwd: process.cwd()
		})

		files = yield files.map(tjs_parseSourceFile)
		// console.log('BEFORE', files)
		files = files.filter(f => f.transforms !== false)
		// console.log('AFTER', files)

		//
		// gulp header
		//
		let s = `'use strict'

const gulp = require('gulp')

let __t = null
try {
	__t = require('./transform.js')
} catch (e) {
	console.error("Could not load 'transform.js!' Exiting...")
	process.exit(1)
}

`

		//
		// individual file transformers
		//
		s += files.map(tjs_gulp_transformFile).join('\n\n')

		//
		// gulp footer
		//
		s += `

gulp.task('default', [ ${files.map(f => "'" + f.file + "'")} ], function(cb) {
	if (typeof __t['default'] == 'function')
		return __t['default'](cb)
	else
		cb()
})

gulp.task('watch', [ 'default' ], function() {
	${files.map(f => "gulp.watch('" + f.file + "', [ '" + f.file + "' ])").join('\n\t')}
})

gulp.task('clean', function(cb) {
	if (typeof __t.clean == 'function')
		__t.clean(cb)
	else
		cb()
})

if (typeof __t.tasks == 'function')
	__t.tasks(gulp)
`

		// print to STDOUT
		console.log(s)
	} catch (e) {
		console.error(e.stack)
	}
})
