
function slash(str) {
	var isExtendedLengthPath = /^\\\\\?\\/.test(str);
	var hasNonAscii = /[^\x00-\x80]+/.test(str);

	if (isExtendedLengthPath || hasNonAscii) {
		return str;
	}

	return str.replace(/\\/g, '/');
}

function relativePath (filePath, root) {

    var root = '.';

    function compute (from, to) {
      return (slash(path.relative(path.dirname(from), to)) || '.') + '/';
    }

    function relativizeCSS (source, relativeRoot) {
      return source.replace(/(url\(['"]?)\/(?!\/)/g, "$1"+relativeRoot);
    }

    function relativizeHTML (source, relativeRoot) {
      return source
        .replace(/(href=["']?)\/(?!\/)/g, '$1'+relativeRoot)
        .replace(/(src=["']?)\/(?!\/)/g, '$1'+relativeRoot);
    }

    this.files.forEach(function(file) {
      var src = file.src[0],
          relativeRoot = compute(src, root),
          extension = path.extname(src),
          filter, contents;

      switch(extension) {
        case '.css': filter = relativizeCSS; break;
        case '.html': filter = relativizeHTML; break;
        default: grunt.warn('Unsupported extension '+src); return;
      }

      contents = grunt.file.read(src);
      contents = filter(contents, relativeRoot);
      grunt.file.write(file.dest, contents);
      grunt.log.writeln('Relativized '+ file.dest);
    });

};



