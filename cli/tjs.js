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
	let cfg = ''

	let rl = readline.createInterface({
		input: fs.createReadStream(path.join(process.cwd(), fname))
	})
	.on('line', line => {
		let m = line.match(/^\s*\/\/%\s+(.*)$/)
		if (m) {
			cfg += m[1]

			// console.log(m, line)
			// stopped = true
			// rl.close()
			// yes({
			// 	file: fname,
			// 	transforms: m[1].split('|>').map(t => t.trim()).filter(t => t != '')
			// })
		}
	})
	.on('close', () => {
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

		// console.log('CFG', fname, cfg)
		yes({ file: fname, transforms: cfg })
	})
})

//
// Generate gulp subscript to transform an individual file based on it's header-spec
//
function tjs_gulp_transformFile(file) {
	return `gulp.task('${file.file}', function() {
	let __t = require('./transform.js')
	let pipe = gulp.src('${file.file}', { base: __dirname })
	${file.transforms.map(t => `pipe = pipe.pipe(__t.${t.name}${t.argsTuple})`).join('\n\t')}
	return pipe.pipe(gulp.dest('./.tjs/'))
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
		files = files.filter(f => f != null && f.transforms.length > 0)

		//
		// gulp header
		//
		let s = `'use strict'
const gulp = require('gulp')
const rimraf = require('rimraf')

`

		//
		// individual file transformers
		//
		s += files.map(tjs_gulp_transformFile).join('\n\n')

		//
		// gulp footer
		//
		s += `

gulp.task('default', [ ${files.map(f => "'" + f.file + "'")} ])

gulp.task('watch', [ 'default' ], function() {
	${files.map(f => "gulp.watch('" + f.file + "', [ '" + f.file + "' ])").join('\n\t')}
})

gulp.task('clean', function(cb) {
	rimraf.sync('./.tjs/')
	cb()
})
`

		// print to STDOUT
		console.log(s)
	} catch (e) {
		console.error(e.stack)
	}
})
