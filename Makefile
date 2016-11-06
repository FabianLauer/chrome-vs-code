.PHONY: clean
clean:
	rm -rf out/src/*

.PHONY: all
all:
	cp -r src/static/ out/src/static
	coffee ./scripts/compileLessCss.coffee
	browserify ./out/src/browser.js > ./out/src/browser.all.js
