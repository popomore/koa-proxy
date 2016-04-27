'use strict';

require('should');
var http = require('http');
var proxy = require('..');
var request = require('supertest');
var koa = require('koa');
var serve = require('koa-static');
var router = require('koa-router');
var parser = require('koa-body-parser');

describe('koa-proxy', function() {

  var server;
  before(function() {
    var app = koa();
    app.use(function* (next) {
      // Set this in response header to allow for proxy request header testing
      this.set('host', this.request.header.host);
      if (this.path === '/error') {
        this.body = '';
        this.status = 500;
        return;
      }
      if (this.path === '/postme') {
        this.body = this.req;
        this.set('content-type', this.request.header['content-type']);
        this.status = 200;
        return;
      }
      if (this.path === '/cookie-me') {
        this.cookies.set('test_cookie', 'nom-nom', { httpOnly: false });
        this.status = 200;
        return;
      }
      if (this.path === '/check-cookie') {
        this.body = this.cookies.get('test_cookie');
        this.status = 200;
        return;
      }

      if (this.querystring) {
        this.body = this.querystring;
        return;
      }
      yield* next;
    });
    app.use(serve(__dirname + '/fixtures'));
    server = app.listen(1234);
  });
  after(function() {
    server.close();
  });

  it('should have option url', function(done) {
    var app = koa();
    app.use(router(app));
    app.get('/index.js', proxy({
      url: 'http://localhost:1234/class.js'
    }));
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
    var app = koa();
    app.use(router(app));
    app.use(proxy({
      host: 'http://localhost:1234',
      url: 'class.js'
    }));
    app.get('/index.js', proxy({
      host: 'http://localhost:1234',
      url: 'class.js'
    }));
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

  it('should have option host', function(done) {
    var app = koa();
    app.use(proxy({
      host: 'http://localhost:1234'
    }));
    var server = http.createServer(app.callback());
    request(server)
      .get('/class.js')
      .expect(200)
      .expect('Content-Type', /javascript/)
      .end(function (err, res) {
        if (err)
          return done(err);
        res.text.should.startWith('define("arale/class/1.0.0/class"');
        done();
      });
  });

  it('should strip trailing slash from option host', function(done) {
    var app = koa();
    app.use(proxy({
      host: 'http://localhost:1234/'
    }));
    var server = http.createServer(app.callback());
    request(server)
      .get('/class.js')
      .expect(200)
      .expect('Host', 'localhost:1234')
      .end(function (err, res) {
        if (err)
          return done(err);
        res.text.should.startWith('define("arale/class/1.0.0/class"');
        done();
      });
  });

  it('should have option host and map', function(done) {
    var app = koa();
    app.use(proxy({
      host: 'http://localhost:1234',
      map: {
        '/index.js': '/class.js'
      }
    }));
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

  it('should have option host and map function', function(done) {
    var app = koa();
    app.use(proxy({
      host: 'http://localhost:1234',
      map: function(path) { return path.replace('index', 'class'); }
    }));
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

  it('should have option host and match', function(done) {
    var app = koa();
    app.use(proxy({
      host: 'http://localhost:1234',
      match: /^\/[a-z]+\.js$/
    }));
    app.use(proxy({
      host: 'http://localhost:1234'
    }));
    var server = http.createServer(app.callback());
    request(server)
      .get('/class.js')
      .expect(200)
      .expect('Content-Type', /javascript/)
      .end(function (err, res) {
        if (err)
          return done(err);
        res.text.should.startWith('define("arale/class/1.0.0/class"');
        done();
      });
  });

  it('url not match for url', function(done) {
    var app = koa();
    app.use(proxy({
      url: 'class.js'
    }));
    app.use(function* () {
      this.body = 'next';
    });
    var server = http.createServer(app.callback());
    request(server)
      .get('/index.js')
      .expect(200)
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .end(function (err, res) {
        if (err)
          return done(err);
        res.text.should.eql('next');
        done();
      });
  });

  it('url not match for map', function(done) {
    var app = koa();
    app.use(proxy({
      map: {
        '/index.js': '/class.js'
      }
    }));
    app.use(function* () {
      this.body = 'next';
    });
    var server = http.createServer(app.callback());
    request(server)
      .get('/index.js')
      .expect(200)
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .end(function (err, res) {
        if (err)
          return done(err);
        res.text.should.eql('next');
        done();
      });
  });

  it('option exist', function() {
    (function() {
      proxy();
    }).should.throw();
  });

  it('encoding', function(done) {
    var app = koa();
    app.use(proxy({
      url: 'http://localhost:1234/index.html',
      encoding: 'gbk'
    }));
    var server = http.createServer(app.callback());
    request(server)
      .get('/index.js')
      .expect(200)
      .expect('Content-Type', 'text/html; charset=utf-8')
      .end(function (err, res) {
        if (err)
          return done(err);
        res.text.should.startWith('<div>中国</div>');
        done();
      });
  });

  it('pass query', function(done) {
    var app = koa();
    app.use(proxy({
      url: 'http://localhost:1234/class.js',
      encoding: 'gbk'
    }));
    var server = http.createServer(app.callback());
    request(server)
      .get('/index.js?a=1')
      .expect(200)
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .end(function (err, res) {
        if (err)
          return done(err);
        res.text.should.startWith('a=1');
        done();
      });
  });

  it('pass request body', function(done) {
    var app = koa();
    app.use(proxy({
      host: 'http://localhost:1234',
    }));
    var server = http.createServer(app.callback());
    request(server)
      .post('/postme')
      .send({foo:'bar'})
      .expect(200)
      .end(function (err, res) {
        if (err)
          return done(err);
        res.text.should.equal('{"foo":"bar"}');
        done();
      });
  });

  it('pass parsed request body', function(done) {
    var app = koa();
    app.use(parser()); // sets this.request.body
    app.use(proxy({
      host: 'http://localhost:1234',
    }));
    var server = http.createServer(app.callback());
    request(server)
      .post('/postme')
      .send({foo:'bar'})
      .expect(200)
      .end(function (err, res) {
        if (err)
          return done(err);
        res.text.should.equal('{"foo":"bar"}');
        done();
      });
  });

  it('statusCode', function(done) {
    var app = koa();
    app.use(proxy({
      host: 'http://localhost:1234'
    }));
    var server = http.createServer(app.callback());
    request(server)
      .get('/error')
      .expect(500, done);
  });

  it('should pass along requestOptions', function(done) {
    var app = koa();
    app.use(proxy({
      url: 'http://localhost:1234/class.js',
      requestOptions: { timeout: 1 }
    }));
    var server = http.createServer(app.callback());
    request(server)
      .get('/index.js')
      .expect(function sleep() {
        // Using the custom assert function to make sure we get a timeout
        var sleepTime = new Date().getTime() + 3;
        while(new Date().getTime() < sleepTime) {}
      })
      .expect(500, done);
  });

  it('should pass along requestOptions when function', function(done) {
    var app = koa();
    app.use(proxy({
      url: 'http://localhost:1234/class.js',
      requestOptions: function(req, opt) {
        opt.timeout = 1;
        return opt;
      }
    }));
    var server = http.createServer(app.callback());
    request(server)
      .get('/index.js')
      .expect(function sleep() {
        // Using the custom assert function to make sure we get a timeout
        var sleepTime = new Date().getTime() + 3;
        while(new Date().getTime() < sleepTime) {}
      })
      .expect(500, done);
  });

  describe('with cookie jar', function () {

    var app = koa();
    app.use(router(app));
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

    var app = koa();
    app.use(router(app));
    app.use(proxy({
      host: 'http://localhost:1234',
      jar: false
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

});
