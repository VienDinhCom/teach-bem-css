"use strict";

var _fs = _interopRequireDefault(require("fs"));

var _del = _interopRequireDefault(require("del"));

var _path = _interopRequireDefault(require("path"));

var _gulp = _interopRequireDefault(require("gulp"));

var _colors = _interopRequireDefault(require("colors"));

var _browserSync = _interopRequireDefault(require("browser-sync"));

var _handlebarsLayouts = _interopRequireDefault(require("handlebars-layouts"));

var _handlebarsHelpers = _interopRequireDefault(require("handlebars-helpers"));

var _bufferReplace = _interopRequireDefault(require("buffer-replace"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var $ = require('gulp-load-plugins')();

var reload = _browserSync.default.reload;

var src = _path.default.join(__dirname, 'src');

var blocks = _path.default.join(src, 'blocks');

(0, _browserSync.default)({
  notify: false,
  // Customize the Browsersync console logging prefix
  logPrefix: 'WSK',
  // Allow scroll syncing across breakpoints
  scrollElementMapping: ['main', '.mdl-layout'],
  // Run as an https by uncommenting 'https: true'
  // Note: this uses an unsigned certificate which on first access
  //       will present a certificate warning in the browser.
  // https: true,
  server: ['dist'],
  open: false,
  port: 3000
});

function getPaths(dir, ext) {
  return _fs.default.readdirSync(dir).filter(function (item) {
    return _fs.default.lstatSync(_path.default.join(dir, item)).isDirectory();
  }).map(function (block) {
    return _path.default.join(dir, block, block + ext);
  }).filter(function (file) {
    if (_fs.default.existsSync(file)) return _fs.default.lstatSync(file).isFile();
    return false;
  });
}

function comment(filePath) {
  var block = _path.default.basename(filePath).replace(_path.default.extname(filePath), '');

  return block === 'global' ? '' : "/* .".concat(block, "\n---------------------------------------------------------------------- */\n");
}

_gulp.default.task('templates', function () {
  var partials = {};
  getPaths(blocks, '.hbs').forEach(function (file) {
    var partial = _path.default.basename(file).replace('.hbs', '');

    partials[partial] = "{{>".concat(partial, "/").concat(partial, "}}");
  });
  return _gulp.default.src('src/*.hbs').pipe($.hb().partials('src/blocks/**/*.hbs').partials(partials).helpers((0, _handlebarsHelpers.default)()).helpers(_handlebarsLayouts.default)).on('error', function (err) {
    // eslint-disable-line
    console.log(err.fileName.underline); // eslint-disable-line

    console.log(_colors.default.grey(' Error:') + '  ✖  '.red + err.message + '\n'); // eslint-disable-line

    this.emit('end');
  }).pipe($.rename(function (file) {
    return file.extname = '.html';
  })) // eslint-disable-line
  .pipe($.htmlmin({
    collapseWhitespace: true,
    removeEmptyAttributes: false,
    removeEmptyElements: false
  })).pipe($.htmlPrettify({
    indent_char: ' ',
    indent_size: 2
  })).pipe(_gulp.default.dest('dist')).pipe($.htmllint({}, function (filepath, issues) {
    issues.forEach(function (issue) {
      console.log('\n' + filepath.underline); // eslint-disable-line

      console.log(_colors.default.grey(' ' + issue.line + ':' + issue.column) + '  ✖  '.red + issue.msg + _colors.default.grey('\t' + issue.code + '\n')); // eslint-disable-line
    });
  })).on('end', function () {
    return reload();
  });
});

_gulp.default.task('libs', function () {
  return _gulp.default.src('src/global/libs/**/*').pipe(_gulp.default.dest('dist/sources/libs'));
});

_gulp.default.task('styles', ['libs'], function (done) {
  var sources = getPaths(blocks, '.scss');
  sources.unshift(_path.default.join(src, 'global/global.scss'));
  return _gulp.default.src(sources).pipe($.sourcemaps.init()).pipe($.stylelint({
    failAfterError: false,
    reporters: [{
      formatter: 'string',
      console: true
    }],
    syntax: 'scss',
    configOverrides: {
      plugins: ['stylelint-scss'],
      rules: {
        'property-no-vendor-prefix': true,
        'value-no-vendor-prefix': true,
        'at-rule-no-vendor-prefix': true
      }
    }
  })).pipe($.tap(function (file) {
    var patternSrc = ':host';

    var block = _path.default.basename(file.path).replace('.scss', '');

    var checkRoot = file.contents.toString().indexOf(patternSrc);
    var patternDest = ".".concat(block);
    if (block === 'global') return;

    if (checkRoot === 0) {
      file.contents = (0, _bufferReplace.default)(Buffer.from(file.contents), patternSrc, patternDest); // eslint-disable-line
    } else {
      console.log('\n' + _path.default.basename(file.path).underline); // eslint-disable-line

      console.log(_colors.default.grey(' 1:1') + '  ✖  '.red + 'Missing the \':host\' selector at the first line.'); // eslint-disable-line
    }
  })).pipe($.insert.transform(function (contents, file) {
    return comment(file.path) + contents;
  })).pipe(_gulp.default.dest('dist/sources')).pipe($.concat('main.scss', {
    newLine: '\n'
  })).pipe($.sass({
    outputStyle: 'expanded'
  }).on('error', $.sass.logError)).pipe($.stylelint({
    failAfterError: false,
    reporters: [{
      formatter: 'string',
      console: true
    }]
  })).pipe($.rename(function (file) {
    return file.extname = '.css';
  })) // eslint-disable-line
  .pipe($.autoprefixer(['ie >= 10', 'ie_mob >= 10', 'ff >= 30', 'chrome >= 34', 'safari >= 7', 'opera >= 23', 'ios >= 7', 'android >= 4.4', 'bb >= 10'])).pipe($.stylelint({
    failAfterError: false,
    fix: true
  })).pipe($.sourcemaps.write('.')).pipe(_gulp.default.dest('dist/assets/styles')).pipe(_browserSync.default.stream());
});

_gulp.default.task('scripts', function () {
  var sources = getPaths(blocks, '.js');
  sources.unshift(_path.default.join(src, 'global/global.js'));
  return _gulp.default.src(sources).pipe($.sourcemaps.init()).pipe($.eslint()).pipe($.eslint.format()).pipe($.indent({
    tabs: false,
    amount: 2
  })).pipe($.if(function (file) {
    return _path.default.basename(file.path) !== 'global.js';
  }, $.insert.prepend('$(\':host\').exists( function() {'))).pipe($.if(function (file) {
    return _path.default.basename(file.path) !== 'global.js';
  }, $.insert.append('\n});\n'))).pipe($.tap(function (file) {
    var block = _path.default.basename(file.path).replace('.js', '');

    var patternSrc = '$(\':host\').exists( function() {';
    var patternDest = patternSrc.replace(':host', ".".concat(block));
    if (block == 'global') return;
    file.contents = (0, _bufferReplace.default)(Buffer.from(file.contents), patternSrc, patternDest); // eslint-disable-line
  })).pipe($.insert.transform(function (contents, file) {
    return comment(file.path) + contents;
  })).pipe($.eslint({
    fix: true
  })).pipe(_gulp.default.dest('dist/sources')).pipe($.concat('main.js', {
    newLine: '\n'
  })).pipe($.sourcemaps.write('.')).pipe(_gulp.default.dest('dist/assets/scripts')).on('end', function () {
    return reload();
  });
});

_gulp.default.task('images', function () {
  return _gulp.default.src('src/images/**/*').pipe($.cache($.imagemin({
    progressive: true,
    interlaced: true
  }))).pipe(_gulp.default.dest('dist/assets/images'));
}).on('end', function () {
  return reload();
});

_gulp.default.task('vendor', ['build'], function () {
  return _gulp.default.src('src/vendor/**/*').pipe(_gulp.default.dest('dist/assets/vendor'));
}).on('end', function () {
  return reload();
});

_gulp.default.task('reload', function () {
  return reload();
});

_gulp.default.task('clean', function () {
  return (0, _del.default)(['dist/*'], {
    dot: true
  });
});

_gulp.default.task('build', ['clean'], function () {
  return _gulp.default.start(['vendor', 'images', 'templates', 'styles', 'scripts']);
});

_gulp.default.task('default', ['build'], function () {
  $.watch(['src/*.hbs', 'src/blocks/**/*.hbs'], function () {
    return _gulp.default.start(['templates']);
  });
  $.watch(['src/global/**/*.{scss,css}', 'src/blocks/**/*.{scss,css}'], function () {
    return _gulp.default.start(['styles']);
  });
  $.watch(['src/global/**/*.js', 'src/blocks/**/*.js'], function () {
    return _gulp.default.start(['scripts']);
  });
  $.watch(['src/images/**/*'], function () {
    return _gulp.default.start(['images']);
  });
  $.watch(['src/vendor/**/*'], function () {
    return _gulp.default.start(['vendor']);
  });
});
