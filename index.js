'use strict';

var join = require('url').resolve;
var iconv = require('iconv-lite');
var request = require('co-request').defaults({ jar: true });
var getRawBody = require('raw-body');

module.exports = function(options) {
  options || (options = {});

  if (!(options.host || options.map || options.url)) {
    throw new Error('miss options');
  }

  return function* proxy(next) {
    var body;
    var url = resolve(this.path, options);

    // don't match
    if (!url) {
      return yield* next;
    }

    // get raw request body
    if (this.request.length) {
      body = yield getRawBody(this.req, {
        length: this.request.length,
        limit: '1mb',
        encoding: this.request.charset
      });
    }

    var opt = {
      url: url + '?' + this.querystring,
      headers: this.header,
      encoding: null,
      method: this.method,
      body: body
    };
    var res = yield request(opt);

    this.status = res.statusCode;
    for (var name in res.headers) {
      this.set(name, res.headers[name]);
    }

    if (options.encoding === 'gbk') {
      this.body = iconv.decode(res.body, 'gbk');
      return;
    }

    this.body = res.body;
  };
};


function resolve(path, options) {
  var url = options.url;
  if (url) {
    if (!/^http/.test(url)) {
      url = options.host ? join(options.host, url) : null;
    }
    return ignoreQuery(url);
  }

  if (options.map && options.map[path]) {
    path = ignoreQuery(options.map[path]);
  }

  return options.host ? join(options.host, path) : null;
}

function ignoreQuery(url) {
  return url ? url.split('?')[0] : null;
}
