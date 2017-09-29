##
## Compiles all Less CSS files into a single file.
##

fs = require('fs')
exec = require('child_process').execSync
lessc = (input, output) -> exec "./node_modules/.bin/lessc --clean-css #{input} > #{output}"

fs.writeFileSync './out/src/all.css', ''
lessc './src/body.less', './out/src/all.css'
lessc './src/theme-light.less', './out/src/theme-light.css'
lessc './src/theme-dark.less', './out/src/theme-dark.css'
lessc './src/theme-dark.less', './out/src/theme-high-contrast.css'
exec './node_modules/.bin/prefix-css body.vscode-light out/src/theme-light.css >> out/src/all.css'
exec './node_modules/.bin/prefix-css body.vscode-dark out/src/theme-dark.css >> out/src/all.css'
exec './node_modules/.bin/prefix-css body.vscode-high-contrast out/src/theme-high-contrast.css >> out/src/all.css'
