import * as chai from 'chai';
import {matchesChromePattern} from "../webextension/js/matchesChromePattern.js";

const {expect} = chai;
describe("Scheme Tests", () => {
    it("should match identical http schemes", () => {
        expect(matchesChromePattern('http://example.com', 'http://example.com/*')).eq(true);
    });
    it("should not match different http/https schemes", () => {
        expect(matchesChromePattern('https://example.com', 'http://example.com/*')).eq(false);
    });
    it("should match identical ftp schemes", () => {
        expect(matchesChromePattern('ftp://example.com', 'ftp://example.com/*')).eq(true);
    });
    it("should match http with wildcard scheme", () => {
        expect(matchesChromePattern('http://example.com', '*://example.com/*')).eq(true);
    });
    it("should match https with wildcard scheme", () => {
        expect(matchesChromePattern('https://example.com', '*://example.com/*')).eq(true);
    });
    it("should NOT match ftp with wildcard scheme (wildcard is http/https only)", () => {
        expect(matchesChromePattern('ftp://example.com', '*://example.com/*')).eq(false);
    });
    it("should match file scheme", () => {
        expect(matchesChromePattern('file:///foo/bar.html', 'file:///foo/*')).eq(true);
    });
});

describe("Host Tests", () => {
    it("should match identical hosts", () => {
        expect(matchesChromePattern('http://google.com/', 'http://google.com/*')).eq(true);
    });
    it("should match subdomain with *.host pattern (www.google.com)", () => {
        expect(matchesChromePattern('http://www.google.com/', 'http://*.google.com/*')).eq(true);
    });
    it("should match base domain with *.host pattern (google.com)", () => {
        expect(matchesChromePattern('http://google.com/', 'http://*.google.com/*')).eq(true);
    });
    it("should match deeper subdomain with *.host pattern (docs.google.com)", () => {
        expect(matchesChromePattern('http://docs.google.com/', 'http://*.google.com/*')).eq(true);
    });
    it("should not match different host with *.host pattern", () => {
        expect(matchesChromePattern('http://another.com/', 'http://*.google.com/*')).eq(false);
    });
    it("should match any host with * host pattern", () => {
        expect(matchesChromePattern('http://www.example.com/path', 'http://*/*')).eq(true);
    });
    it("should match file URL with empty host against empty host in pattern", () => {
        expect(matchesChromePattern('file:///foo.html', 'file:///*')).eq(true);
    });
    it("should match file URL with empty host against specific empty host in pattern", () => {
        expect(matchesChromePattern('file:///foo.html', 'file:///*')).eq(true); // pHost becomes "" effectively
    });
});

describe("Path Tests", () => {
    it("should match path with wildcard (foo*)", () => {
        expect(matchesChromePattern('http://example.com/foo/bar.html', 'http://example.com/foo*')).eq(true);
    });
    it("should match path with directory wildcard (foo/*)", () => {
        expect(matchesChromePattern('http://example.com/foo/', 'http://example.com/foo/*')).eq(true);
    });
    it("should match specific file in directory with wildcard (foo/*)", () => {
        expect(matchesChromePattern('http://example.com/foo/baz', 'http://example.com/foo/*')).eq(true);
    });
    it("should not match different path (bar vs foo/*)", () => {
        expect(matchesChromePattern('http://example.com/bar', 'http://example.com/foo/*')).eq(false);
    });
    it("should match exact path when pattern has no wildcard but URL has trailing slash", () => {
        expect(matchesChromePattern('http://example.com/', 'http://example.com/')).eq(true);
    });
    it("should match exact path when pattern has no wildcard and URL implies root path", () => {
        // new URL("http://example.com").pathname is "/"
        expect(matchesChromePattern('http://example.com', 'http://example.com/')).eq(true);
    });
    it("should match path with query and hash using path wildcard", () => {
        expect(matchesChromePattern('http://example.com/path?query=1#hash', 'http://example.com/path*')).eq(true);
    });
    it("should match exact path", () => {
        expect(matchesChromePattern('http://example.com/path', 'http://example.com/path')).eq(true);
    });
    it("should match path with trailing slash if pattern does not have it (regex behavior)", () => {
        // pPath = /path, uPath = /path/ -> regex ^/path matches /path/
        expect(matchesChromePattern('http://example.com/path/', 'http://example.com/path')).eq(true);
    });
    it("should NOT match path if pattern has trailing slash and URL does not", () => {
        // pPath = /path/, uPath = /path -> regex ^/path/ does not match /path
        expect(matchesChromePattern('http://example.com/path', 'http://example.com/path/')).eq(false);
    });
});

describe("<all_urls> Tests", () => {
    it("should match http URL with <all_urls>", () => {
        expect(matchesChromePattern('http://any.thing/goes', '<all_urls>')).eq(true);
    });
    it("should match https URL with <all_urls>", () => {
        expect(matchesChromePattern('https://secure.site/page', '<all_urls>')).eq(true);
    });
    it("should NOT match ftp URL with <all_urls> (due to * scheme restriction)", () => {
        expect(matchesChromePattern('ftp://files.server/data', '<all_urls>')).eq(false);
    });
    it("should NOT match file URL with <all_urls> (due to * scheme restriction)", () => {
        // <all_urls> -> *://*/* -> scheme * is http/https
        expect(matchesChromePattern('file:///c/temp/file.txt', '<all_urls>')).eq(false);
    });
});

describe("File Scheme Specific Tests", () => {
    it("should match file URL with path wildcard", () => {
        expect(matchesChromePattern('file:///path/to/file.html', 'file:///path/to/*')).eq(true);
    });
    it("should not match file URL with different path", () => {
        expect(matchesChromePattern('file:///path/to/file.html', 'file:///other/*')).eq(false);
    });
    it("should match file URL with explicit empty host and path wildcard", () => {
        expect(matchesChromePattern('file:///path/to/file.html', 'file:///*')).eq(true);
    });
});

describe("Edge Case and Invalid Pattern Tests", () => {
    it("should match exact path for /foo vs /foo", () => {
        expect(matchesChromePattern('http://example.com/foo', 'http://example.com/foo')).eq(true);
    });
    it("should match /foobar with pattern /foo (as /foo is a prefix)", () => {
        // pPath = /foo -> regex ^/foo
        // uPath = /foobar -> test is true.
        expect(matchesChromePattern('http://example.com/foobar', 'http://example.com/foo')).eq(true);
    });
    it("should match /foo/ with pattern /foo", () => {
        expect(matchesChromePattern('http://example.com/foo/', 'http://example.com/foo')).eq(true);
    });
    it("should return false for invalid pattern (missing ://)", () => {
        expect(matchesChromePattern('http://example.com', 'example.com/*')).eq(false);
    });
    it("should return false for invalid URL", () => {
        expect(matchesChromePattern('not_a_url', 'http://example.com/*')).eq(false);
    });
    it("should handle pattern with host only (e.g. http://example.com)", () => {
        // pPath becomes "/"
        expect(matchesChromePattern('http://example.com', 'http://example.com')).eq(true);
        expect(matchesChromePattern('http://example.com/', 'http://example.com')).eq(true);
        expect(matchesChromePattern('http://example.com/path', 'http://example.com')).eq(true); // pPath is / so matches /path
    });
});
