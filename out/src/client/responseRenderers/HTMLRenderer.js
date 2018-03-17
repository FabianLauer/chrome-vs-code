"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const ResponseRenderer_1 = require('../ResponseRenderer');
const ResponseRendererFactory_1 = require('../ResponseRendererFactory');
const internalRouteMapReader_1 = require('../internalRouteMapReader');
const InternalRoute_1 = require('../../server/InternalRoute');
const utils_1 = require('../../utils');
let HTMLRenderer_1 = class HTMLRenderer extends ResponseRenderer_1.default {
    /**
     * Renders a certain response in the renderer's current viewport.
     * @param responseURI The URI from which the response was loaded.
     * @param response The response to render.
     */
    renderResponseConcrete(responseURI, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const parsedDocument = HTMLRenderer_1.parseResponseAsHTMLDocument(responseURI, response);
            yield this.viewport.renderHTML(parsedDocument.documentElement.outerHTML);
        });
    }
    /**
     * Attempts to generate a favicon for the rendered response.
     * @param responseURI The URI from which the response was loaded.
     * @param response The response to render.
     */
    generateFaviconConcrete(responseURI, response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (/^about:/.test(responseURI)) {
                return HTMLRenderer_1.ownFavicon;
            }
            const parsedDocument = HTMLRenderer_1.parseResponseAsHTMLDocument(responseURI, response);
            const links = parsedDocument.getElementsByTagName('link');
            for (let i = 0; i < links.length; i++) {
                const link = links[i];
                if (link.hasAttribute('href') && /icon|shortcut/i.test(link.getAttribute('rel'))) {
                    return link.getAttribute('href');
                }
            }
            return undefined;
        });
    }
    static parseResponseAsHTMLDocument(responseURI, response) {
        // check if the last document we parsed can be used again
        if (typeof HTMLRenderer_1.lastRecentParsed === 'object' &&
            HTMLRenderer_1.lastRecentParsed !== null &&
            HTMLRenderer_1.lastRecentParsed.responseURI === responseURI &&
            HTMLRenderer_1.lastRecentParsed.response === response) {
            return HTMLRenderer_1.lastRecentParsed.parsedDocument;
        }
        // parse the document
        const parsedDocument = document.implementation.createHTMLDocument('response');
        parsedDocument.documentElement.innerHTML = response.responseText;
        HTMLRenderer_1.updateAllURIAttributes(parsedDocument, responseURI);
        // update the cache
        HTMLRenderer_1.lastRecentParsed = HTMLRenderer_1.lastRecentParsed || {};
        HTMLRenderer_1.lastRecentParsed.responseURI = responseURI;
        HTMLRenderer_1.lastRecentParsed.response = response;
        HTMLRenderer_1.lastRecentParsed.parsedDocument = parsedDocument;
        return parsedDocument;
    }
    static getBaseURLFromServerResponse(responseURL) {
        return utils_1.parseURL(responseURL.replace(/^.*?\?/, ''));
    }
    static updateAllURIAttributes(document, responseURI) {
        responseURI = responseURI.trim();
        const parsedResponseURL = utils_1.parseURL(responseURI);
        const parsedURL = HTMLRenderer_1.getBaseURLFromServerResponse(responseURI);
        const baseURL = `${parsedURL.protocol}//${parsedURL.host}`;
        const elements = document.getElementsByTagName('*');
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            for (let a = 0; a < element.attributes.length; a++) {
                const attribute = element.attributes[a];
                // remove 'target' attributes to prevent pages attempting to open another tab/window
                if (attribute.name === 'target') {
                    element.removeAttributeNode(attribute);
                }
                if (attribute.name !== 'src' && attribute.name !== 'href' && attribute.name !== 'xlink:href') {
                    continue;
                }
                // skip all...
                if (
                // data URIs
                /^data:/.test(attribute.value) ||
                    // hash only links (e.g. href="#foo")
                    /^#/.test(attribute.value)) {
                    continue;
                }
                // full protocol in URI
                if (/^[a-z]+?:\//.test(attribute.value)) {
                    attribute.value = `${internalRouteMapReader_1.default(InternalRoute_1.default.Load)}?${escape(attribute.value)}`;
                }
                else if (/^:?\/\/+/.test(attribute.value)) {
                    attribute.value = attribute.value.replace(/^:?\/+/, '');
                    attribute.value = `${internalRouteMapReader_1.default(InternalRoute_1.default.Load)}?${parsedURL.protocol}//${escape(attribute.value)}`;
                }
                else if (!/^\//.test(attribute.value)) {
                    // if the page URI ends with a slash, treat the URI in the attribute as relative to the page URI
                    if (/\/$/.test(parsedResponseURL.pathname)) {
                        attribute.value =
                            internalRouteMapReader_1.default(InternalRoute_1.default.Load) +
                                `?${parsedResponseURL.protocol}//${parsedResponseURL.host}/${parsedResponseURL.path}/${escape(attribute.value)}`;
                    }
                    else {
                        attribute.value = `${internalRouteMapReader_1.default(InternalRoute_1.default.Load)}?${parsedResponseURL.protocol}//${parsedResponseURL.host}/${escape(attribute.value)}`;
                    }
                }
                else {
                    attribute.value = `${internalRouteMapReader_1.default(InternalRoute_1.default.Load)}?${baseURL}/${escape(attribute.value)}`;
                }
            }
        }
    }
};
let HTMLRenderer = HTMLRenderer_1;
HTMLRenderer.ownFavicon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABKVBMVEUAAAD+1ABCuDnsJhwFlN7sJyL/2gDnDCXnxAQAmumTOENHqjY9rz0wxz5Muik5sU3ULS8AlOdSqDbXJx8Mj8wAmOUmzz1Mvh7iKSMAkt2jMTVIwzQ5wDr/4wD/9wABkN0Dj9aNGRUBWYYzmDoDj9bnJiFSqzcAhP+3IxsAh/MKkNL//QD/5gBnEg8Dj9bJeguJs2HAOhcznam0TycHhdgVmKTeFRYpj01nlzSTKxIwnLH+GREHjNp3IA791AABlN5CuDkCkNP/MSbsKSEAi/oAoPUAiPUCj9kHhdTtESj/7wD/4AAAme8Bkd0Wis0eir0/tkAxyTw6wTtGrTZGvDFNySzmFSflJSPdIiHmISDUxh7ZMR7lGx7/Dxz4xQX/GQPr1wDuyADwDAAssYJaAAAAPnRSTlMAm5zEv6eIfHH19PPy8PDh4N/c29bRzs7MysW2ta+uqaWRj42Mi4iDgH9/enl4c3JuZGJCQT08OzggHRcSAvY0/88AAACvSURBVBjTY8ALtIysUPh6jm4iBgwWakKqEL6Ko4tHlCyDTGBwJCuIr+Do5p/ozcjAFMQd48zMwMDi7q7J4W0HFHAQM46Nl2Cxt1dn0LEDC/AyWAv4uXKaMDCwQQT4GGwEXe25zOAC4qYu9qJSSc7sDNpggRAeD19JBgZm53B2Di+ggHRogI88yFpWp7DoBC9GBnNlfiWIwxSdPCPi5JCdruvkKayP4hkNQ0tbDB8DAOyhGpl7KuXzAAAAAElFTkSuQmCC';
HTMLRenderer = HTMLRenderer_1 = __decorate([
    ResponseRendererFactory_1.default.register(response => {
        var score = 0;
        if (response.status === 200) {
            score += 1;
        }
        if (response.getResponseHeader('Content-Type') === 'text/html') {
            score += 100;
        }
        return score;
    })
], HTMLRenderer);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HTMLRenderer;
//# sourceMappingURL=HTMLRenderer.js.map