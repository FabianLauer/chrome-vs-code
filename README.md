# ![](https://raw.githubusercontent.com/FabianLauer/chrome-vs-code/master/out/src/static/logo-32x32.png) **Chrome VS Code** <small style="color: #fff; background: #fdd400; padding: .1em .4em; font-size: 0.4em; font-weight: 600; position: relative; top: -0.7em">PREVIEW</small>

## Google Chrome for Visual Studio Code.


### **First things first:** This is a preview.

Chrome VS Code is currently an early version of what could become a very handy extension for many Visual Studio Code users. Chrome VS Code has to work around content security policies to escape VS Code's sandbox though, which means that **security concerns are yet to be resolved**. To limit these concerns, the following precautions are taken:

- **No cookies as of yet.** This means you can't log in anywhere.
- **No local storage, session storage, etc.**

This means, **there is no such thing as safe browsing**. Make sure you're fine with the risk before you install and use it. Also, you are *very* likely to encounter bugs — please be a dear and report them over at GitHub. Or why not submit a PR or two? 😉 


____


![Screenshot](./out/src/static/screenshots/dark-theme-with-sidebar-001.png)


## Key Features

👌 stable &nbsp;&nbsp;&nbsp; ⚒ experimental &nbsp;&nbsp;&nbsp; ✋ not implemented

|	Status	 |	Feature
|------------|-
|	⚒		|	Browse to http:// and https:// URLs
|	⚒		|	Browse to file:// URLs
|	👌		 |	Use address bar to search the web with your favorite search engine
|	👌		 |	Open in normal and split view
|	👌		 |	Customizable homepage
|	👌		 |	VS Code dark theme
|	👌		 |	VS Code light theme
|	✋		 |	VS Code high-contrast theme
|	✋		|	Validate HTTPS certifications
|	✋		|	Cookies (this means you can't log in *anywhere*)
|	✋		|	Open selected URL
|	✋		|	Open PDFs
|	✋		|	Find in page


## Known Issues

Unfortunately, some issues are probably here to stay:

- Tab rebuilds after being hidden or dragged [#15437](https://github.com/Microsoft/vscode/issues/15437)


## How Chrome VS Code escapes the sandbox

VS Code has the capability of showing so called *virtual documents* in editor tabs. They are normally used to render previews for HTML, CSS, SVG, Markdown files and so on. Chrome VS Code renders its GUI inside such a virtual document.

Virtual documents live in a sandbox, though. This means that communication with a virtual document via JavaScript is limited by the same origin policy, thus just loading any website, say google.com, inside a virtual document will immediately prevent the JavaScript code 'surrounding' the virtual document from accessing the loaded web page. This is where it becomes tricky: In order for a browser to control web pages (UI and code injection), both the browser and the webpage must be loaded from the same origin.

To do this, Chrome VS Code runs a proxy server in the extension process through which requests are redirected. While not particularly elegant, it allows to circumvent the SOP.



## Contributing

You're welcome to submit issues and PRs on GitHub — don't be shy!


## License

MIT. See `LICENSE` file.


## Screenshots

![Screenshot](https://raw.githubusercontent.com/FabianLauer/chrome-vs-code/master/out/src/static/screenshots/light-theme-with-sidebar-001.png)
