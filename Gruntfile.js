const js_sources = ['src/textparser.js', 'src/domparser.js', 'src/manipulators.js', 'src/view.js'];

module.exports = function(grunt) {
  grunt.initConfig({
      concat: {
          options: {
            banner: '(function(){',
            footer: '})();',
            sourcemap: true
          },
          dist: {
              src: js_sources,
              dest: 'dist/tv.js',
          },
      },
      clean : ['dist', 'build'],
      watch: { 
        files: js_sources,
        tasks: ['concat']
      }
  });
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['concat']);
  grunt.registerTask('build', ['concat']);
}
