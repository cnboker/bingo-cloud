module.exports = {
	globDirectory: 'wwwroot/',
	globPatterns: [
		'**/*.{jpeg,mp4,webm,js,html,css}'
	],
	swDest: 'wwwroot/sw.js',
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	]
};