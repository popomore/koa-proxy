# koa-proxy [![Build Status](https://travis-ci.org/popomore/koa-proxy.png?branch=master)](https://travis-ci.org/popomore/koa-proxy) [![Coverage Status](https://coveralls.io/repos/popomore/koa-proxy/badge.png?branch=master)](https://coveralls.io/r/popomore/koa-proxy?branch=master) 

Proxy middleware for koa

---

## Install

```
$ npm install koa-proxy -g
```

## Usage

When you request http://localhost:3000/index.js, it will fetch http://alicdn.com/index.js and return. 

```
var koa = require('koa');
var proxy = require('koa-proxy');
var app = koa();
app.use(proxy({
  host: 'http://alicdn.com'
}));
app.listen(3000);
```

You can proxy a specified url.

```
app.get('index.js', proxy({
  url: 'http://alicdn.com/index.js'
}));
```

You can specify a key/value object that can map your request's path to the other.

```
app.get('index.js', proxy({
  host: 'http://alicdn.com',
  map: {
    'index.js': 'index-1.js'
  }
}));
```

You can specify a function that can map your request's path to the desired destination.

```
app.get('index.js', proxy({
  host: 'http://alicdn.com',
  map: function(path) { return 'public/' + path; }
}));
```

You can specify match criteria to restrict proxy calls to a given path.

```
app.use(proxy({
  host:  'http://alicdn.com', // proxy alicdn.com...
  match: /^\/static\//        // ...just the /static folder
}));
```

Or you can use match to exclude a specific path.

```
app.use(proxy({
  host:  'http://alicdn.com',     // proxy alicdn.com...
  match: /^(?!\/dontproxy\.html)/ // ...everything except /dontproxy.html
}));
```

## LICENSE

Copyright (c) 2014 popomore. Licensed under the MIT license.
