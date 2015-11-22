module.exports = function(grunt) {
	grunt.initConfig({
		less: {
			development: {
				options: {
					compress: true,
					yuicompress: true,
					optimization: 2
				},
				files: {
					'main.css': 'main.less'
				}
			}
		},
		autoprefixer: {
			dist: {
				files: {
					'main.css': 'main.css'
				}
			}
		},
		watch: {
			styles: {
				files: ['main.less'],
				tasks: ['less', 'autoprefixer']
			}
		}
	});
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-autoprefixer');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.registerTask('default', ['less', 'autoprefixer', 'watch']);
};
