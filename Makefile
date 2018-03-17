.PHONY: clean
clean:
	rm -rf out/src/*

.PHONY: all
all:
	cp -r src/static/ out/src/static
	./node_modules/.bin/coffee ./scripts/compileLessCss.coffee
	./node_modules/.bin/browserify ./out/src/browser.js > ./out/src/browser.all.js

.PHONY: package
package:
	vsce package --baseContentUrl https://raw.githubusercontent.com/FabianLauer/chrome-vs-code/master/ --baseImagesUrl https://raw.githubusercontent.com/FabianLauer/chrome-vs-code/master/
