const js_sources = ['src/textparser.js', 'src/domparser.js', 'src/manipulators.js', 'src/view.js'];

module.exports = function(grunt) {
  grunt.initConfig({
      concat: {
          options: {
            banner: '(function(){',
            footer: '})();'
          },
          dist: {
              src: js_sources,
              dest: 'dist/simpleview.js',
          },
      },
      uglify: {
          dist: {
              src: 'dist/simpleview.js',
              dest: 'dist/simpleview.min.js'
          }
      },
      clean : ['dist', 'build']
  });
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.registerTask('default', ['concat']);
  grunt.registerTask('build', ['concat', 'uglify'])
}
