
0.9.0 / 2017-09-04
==================

  * Added suppressRequestHeaders and suppressResponseHeaders options (#54)

0.8.0 / 2017-02-03
==================

  * feat: [BREAKING_CHANGE] set jar = false by default (#48)
  * feat: add a yieldNext option (#47)

0.7.0 / 2016-12-27
==================

  * Add option to enable/disable following redirects (#45)
  * surely most people would want to install this as regular dependency, not as global one (#36)

0.6.0 / 2016-04-28
==================

  * Support requestOptions as functions (#28)

0.5.0 / 2016-02-24
==================

  * Exposing the cookie jar to the options interface
  * fix: should not return Transfer-encoding header
  * Added support for requestOptions to be passed as options to the underlying request
  * strip trailing slash from headers.host

0.4.1 / 2015-10-09
==================

  * check contentType is defined before calling indexOf (fixes bug when used in conjunction with koa-bodyparser)

0.4.0 / 2015-09-09
==================

  * added ability to have map as a function rather than an object

## 0.3.0

Add `host` and `match` option

## 0.2.0

Munge body object to JSON when appropriate

## 0.1.3

- fix headers option
- switch to co-request
- pass request method and body to proxy

## 0.1.2

return proxy's statusCode

## 0.1.1

should pass querystring

## 0.1.0

First commit
