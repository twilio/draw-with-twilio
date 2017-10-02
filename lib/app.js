'use strict';

const createAccessToken = require('./token');
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const twilio = require('twilio');

const app = express();

app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms'));

app.use(express.static(path.resolve(__dirname, '..', 'js')));
app.use(express.static(path.resolve(__dirname, '..', 'css')));
app.use(express.static(path.resolve(__dirname, '..', 'html')));

function createToken(req) {
  const urlParameters = req.query;
  const identity = urlParameters.identity;

  const options = {};
  if (typeof urlParameters.ttl === 'string') {
    options.ttl = parseInt(urlParameters.ttl);
  }

  return createAccessToken(identity, options);
}

function handleAccessTokenRequest(req, res) {
  res.set('Content-Type', 'text/plain');
  res.send(createToken(req));
}

app.get('/token', handleAccessTokenRequest);

app.get('*', (req, res) => {
  res.redirect(302, '/index.html');
});

module.exports = app;
