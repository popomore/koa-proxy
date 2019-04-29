'use strict';

require('should');
var http = require('http');
var path = require('path');
var fs = require('fs');
var proxy = require('..');
var request = require('supertest');
var Koa = require('koa');
var serve = require('koa-static');
var convert = require('koa-convert')
var Router = require('koa-router');
var parser = require('koa-body');

describe('koa-proxy', function() {

  var server;
  before(function() {
    var app = new Koa();
    app.use(parser({ multipart: true }));
    app.use(async (ctx, next) => {
      // Set this in response header to allow for proxy request header testing
      ctx.set('host', ctx.request.header.host);
      if (ctx.path === '/error') {
        ctx.status = 500;
        return;
      }
      if (ctx.path === '/postme') {
        ctx.body = ctx.request.body;
        ctx.set('content-type', ctx.request.header['content-type']);
        ctx.status = 200;
        return;
      }
      if (ctx.path === '/upload-raw') {
        // echo the uploaded file contents to the response body
        ctx.body = fs
          .readFileSync(ctx.request.body.files.test.path)
          .toString();
        ctx.status = 200;
        return;
      }
      if (ctx.path === '/cookie-me') {
        ctx.cookies.set('test_cookie', 'nom-nom', { httpOnly: false });
        ctx.status = 200;
        return;
      }
      if (ctx.path === '/check-cookie') {
        ctx.body = ctx.cookies.get('test_cookie');
        ctx.status = 200;
        return;
      }
      if (ctx.path === '/redirect') {
        ctx.redirect('http://google.com');
        return;
      }
      if (ctx.path === '/suppress-my-headers') {
        var headers = ctx.request.header;
        ctx.set('jar-jar', 'binks');
        ctx.body = headers;
        ctx.status = 200;
        return;
      }
      if (ctx.querystring) {
        // To test query string
        ctx.body = ctx.querystring;
        return;
      }
      await next();
    });
    app.use(serve(__dirname + '/fixtures'));
    server = app.listen(1234);
  });
  after(function() {
    server.close();
  });

  it('should have option url', function(done) {
    var app = new Koa();
    var router = new Router();
    router.get('/index.js', proxy({
      url: 'http://localhost:1234/class.js'
    }));
    app.use(router.routes());
    var server = http.createServer(app.callback());
    request(server)
      .get('/index.js')
      .expect(200)
      .expect('Content-Type', /javascript/)
      .end(function (err, res) {
        if (err)
          return done(err);
        res.text.should.startWith('define("arale/class/1.0.0/class"');
        done();
      });
  });

  it('should have option url and host', function(done) {
    var app = new Koa();
    app.use(proxy({
      host: 'http://localhost:1234',
      url: 'class.js'
    }));
    var router = new Router();
    router.get('/index.js', proxy({
      host: 'http://localhost:1234',
      url: 'class.js'
    }));
    app.use(router.routes());
    var server = http.createServer(app.callback());
    request(server)
      .get('/index.js')
      .expect(200)
      .expect('Content-Type', /javascript/)
      .end(function (err, res) {
        if (err)
          return done(err);
        res.text.should.startWith('define("arale/class/1.0.0/class"');
        done();
      });
  });

  it("should have option host", function(done) {
    var app = new Koa();
    app.use(proxy({ host: "http://localhost:1234" }));
    var server = http.createServer(app.callback());
    request(server)
      .get("/class.js")
      .expect(200)
      .expect("Content-Type", /javascript/)
      .end(function(err, res) {
        if (err) return done(err);
        res.text.should.startWith('define("arale/class/1.0.0/class"');
        done();
      });
  });

  it("should strip trailing slash from option host", function(done) {
    var app = new Koa();
    app.use(proxy({ host: "http://localhost:1234/" }));
    var server = http.createServer(app.callback());
    request(server)
      .get("/class.js")
      .expect(200)
      .expect("Host", "localhost:1234")
      .end(function(err, res) {
        if (err) return done(err);
        res.text.should.startWith('define("arale/class/1.0.0/class"');
        done();
      });
  });

  it("should have option host and map", function(done) {
    var app = new Koa();
    app.use(proxy({
        host: "http://localhost:1234",
        map: {
          "/index.js": "/class.js"
        }
      }));
    var server = http.createServer(app.callback());
    request(server)
      .get("/index.js")
      .expect(200)
      .expect("Content-Type", /javascript/)
      .end(function(err, res) {
        if (err) return done(err);
        res.text.should.startWith('define("arale/class/1.0.0/class"');
        done();
      });
  });

  it("should have option host and map function", function(done) {
    var app = new Koa();
    app.use(proxy({ host: "http://localhost:1234", map: function(path) {
          return path.replace("index", "class");
        } }));
    var server = http.createServer(app.callback());
    request(server)
      .get("/index.js")
      .expect(200)
      .expect("Content-Type", /javascript/)
      .end(function(err, res) {
        if (err) return done(err);
        res.text.should.startWith('define("arale/class/1.0.0/class"');
        done();
      });
  });

  it("should have option host and match", function(done) {
    var app = new Koa();
    app.use(proxy({
        host: "http://localhost:1234",
        match: /^\/[a-z]+\.js$/
      }));
    app.use(proxy({ host: "http://localhost:1234" }));
    var server = http.createServer(app.callback());
    request(server)
      .get("/class.js")
      .expect(200)
      .expect("Content-Type", /javascript/)
      .end(function(err, res) {
        if (err) return done(err);
        res.text.should.startWith('define("arale/class/1.0.0/class"');
        done();
      });
  });

  it("should have option followRedirect", function(done) {
    var app = new Koa();
    app.use(proxy({ host: "http://localhost:1234", followRedirect: false }));
    var server = http.createServer(app.callback());
    request(server)
      .get("/redirect")
      .expect(302)
      .expect("Location", /google.com/)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
  });

  it("should have option yieldNext", function(done) {
    var app = new Koa();
    app.use(proxy({ host: "http://localhost:1234/", yieldNext: true }));
    app.use(() => {
      done();
    });
    var server = http.createServer(app.callback());
    request(server)
      .get("/class.js")
      .expect(200)
      .expect("Host", "localhost:1234")
      .end(function(err, res) {
        if (err) return done(err);
      });
  });

  it("url not match for url", function(done) {
    var app = new Koa();
    app.use(proxy({ url: "class.js" }));
    app.use(ctx => {
      ctx.body = "next";
    });
    var server = http.createServer(app.callback());
    request(server)
      .get("/index.js")
      .expect(200)
      .expect("Content-Type", "text/plain; charset=utf-8")
      .end(function(err, res) {
        if (err) return done(err);
        res.text.should.eql("next");
        done();
      });
  });

  it("url not match for map", function(done) {
    var app = new Koa();
    app.use(proxy({ map: { "/index.js": "/class.js" } }));
    app.use(ctx => {
      ctx.body = "next";
    });
    var server = http.createServer(app.callback());
    request(server)
      .get("/index.js")
      .expect(200)
      .expect("Content-Type", "text/plain; charset=utf-8")
      .end(function(err, res) {
        if (err) return done(err);
        res.text.should.eql("next");
        done();
      });
  });

  it("option exist", function() {
    (function() {
      proxy();
    }.should.throw());
  });

  it("pass query", function(done) {
    var app = new Koa();
    app.use(proxy({
        url: "http://localhost:1234/class.js",
        encoding: "gbk"
      }));
    var server = http.createServer(app.callback());
    request(server)
      .get("/index.js?a=1")
      .expect(200)
      .expect("Content-Type", "text/plain; charset=utf-8")
      .end(function(err, res) {
        if (err) return done(err);
        res.text.should.startWith("a=1");
        done();
      });
  });

  it("pass request body", function(done) {
    var app = new Koa();
    app.use(parser());
    app.use(proxy({ host: "http://localhost:1234" }));
    var server = http.createServer(app.callback());
    request(server)
      .post("/postme")
      .send({ foo: "bar" })
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        res.text.should.equal('{"foo":"bar"}');
        done();
      });
  });

  it('should pass request as stream', function(done) {
    var app = new Koa();
    app.use(proxy({ host: 'http://localhost:1234' }));
    var server = http.createServer(app.callback());
    request(server)
      .post('/upload-raw')
      .attach('test', path.resolve(__dirname, 'fixtures/upload.txt'))
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        res.text.should.equal('test me');
        done();
      });
  });

  it("pass parsed request body", function(done) {
    var app = new Koa();
    app.use(parser()); // sets ctx.request.body
    app.use(proxy({ host: "http://localhost:1234" }));
    var server = http.createServer(app.callback());
    request(server)
      .post("/postme")
      .send({ foo: "bar" })
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        res.text.should.equal('{"foo":"bar"}');
        done();
      });
  });

  it("statusCode", function(done) {
    var app = new Koa();
    app.use(proxy({ host: "http://localhost:1234" }));
    var server = http.createServer(app.callback());
    request(server)
      .get("/error")
      .expect(500, done);
  });

  it("should pass along requestOptions", function(done) {
    var app = new Koa();
    app.use(proxy({
        url: "http://localhost:1234/class.js",
        requestOptions: {
          url: 'http://localhost:12345/class.js' // change port, should yield 500
        }
      }));
    var server = http.createServer(app.callback());
    request(server)
      .get("/index.js")
      .expect(500, done);
  });

  it('should pass along requestOptions when function', function(done) {
    var app = new Koa();
    app.use(proxy({
      url: 'http://localhost:1234/class.js',
      requestOptions: function(req, opt) {
        opt.url = 'http://localhost:12345/class.js'; // change port, should yield 500
        return opt;
      }
    }));
    var server = http.createServer(app.callback());
    request(server)
      .get('/index.js')
      .expect(500, done);
  });

  describe('with cookie jar', function () {

    var app = new Koa();
    app.use(proxy({
      host: 'http://localhost:1234',
      jar: true
    }));
    var server = http.createServer(app.callback());
    var agent = request.agent(server);

    it('should set cookies', function(done) {
      agent
        .get('/cookie-me')
        .expect(200)
        .expect('set-cookie', 'test_cookie=nom-nom; path=/')
        .end(function (err, res) {
          if (err)
            return done(err);
          done();
        });
    });

    it('should retain cookies', function(done) {
      agent
        .get('/check-cookie')
        .expect(200)
        .expect('nom-nom', done);
    });

    it('should retain cleared cookies', function(done) {
      var req = agent
        .get('/check-cookie');
      req.cookies = '';
      req
        .expect(200)
        .expect('nom-nom', done);
    });

  });

  describe('without cookie jar', function () {

    var app = new Koa();
    app.use(proxy({
      host: 'http://localhost:1234',
    }));
    var server = http.createServer(app.callback());
    var agent = request.agent(server);

    it('should set cookies', function(done) {
      agent
        .get('/cookie-me')
        .expect(200)
        .expect('set-cookie', 'test_cookie=nom-nom; path=/')
        .end(function (err, res) {
          if (err)
            return done(err);
          done();
        });
    });

    it('should retain cookies', function(done) {
      agent
        .get('/check-cookie')
        .expect(200)
        .expect('nom-nom', done);
    });

    it('should not retain cleared cookies', function(done) {
      var req = agent
        .get('/check-cookie');
      req.cookies = '';
      req
        .expect(200)
        .end(function (err, res) {
          if (err)
            return done(err);
          res.text.should.not.equal('nom-nom');
          done();
        });
    });
  });

  describe('with suppressed request and response headers', function () {

    var app = new Koa();
    app.use(proxy({
      host: 'http://localhost:1234',
      suppressRequestHeaders: ['foO','bAr'],
      suppressResponseHeaders: ['jaR-Jar']
    }));
    var server = http.createServer(app.callback());
    var agent = request.agent(server);

    it('should remove headers', function(done) {
      agent
        .get('/suppress-my-headers')
        .set('foo', 'kung')
        .set('bar', 'none')
        .set('happy', 'path')
        .expect(200)
        .expect(function(res){
          if(res.headers['jar-jar']) throw new Error("jar-jar header was present");
          if(res.body['foo']) throw new Error("foo header was present");
          if(res.body['bar']) throw new Error("bar header was present");
        })
        .end(function (err, res) {
          if (err)
            return done(err);
          done();
        });
    });
  });
});
