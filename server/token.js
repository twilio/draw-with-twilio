/* @flow */
'use strict';

const credentials = require('../twilio_credentials');
const twilio = require('twilio');

function createAccessToken(environment, identity, configurationProfileSid, options) {
  options = options || {};
  const accessTokenGenerator = new twilio.AccessToken(
    credentials[environment].accountSid,
    credentials[environment].signingKeySid,
    credentials[environment].signingKeySecret,
    options);
  accessTokenGenerator.identity = identity;
  accessTokenGenerator.addGrant(
    new twilio.AccessToken.VideoGrant({
      configurationProfileSid: configurationProfileSid
    }));
  return accessTokenGenerator.toJwt();
}

module.exports = createAccessToken;
