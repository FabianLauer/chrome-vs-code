.PHONY: all
all:
	coffee ./scripts/compileLessCss.coffee
	browserify ./out/src/browser.js > ./out/src/browser.all.js
