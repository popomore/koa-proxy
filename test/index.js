'use strict';

require('should');
var http = require('http');
var proxy = require('..');
var request = require('supertest');
var koa = require('koa');
var serve = require('koa-static');
var router = require('koa-router');

describe('koa-proxy', function() {

  var server;
  before(function() {
    var app = koa();
    app.use(function* (next) {
      if (this.path === '/error') {
        this.body = '';
        this.status = 500;
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
});
