'use strict';

const credentials = require('../twilio_credentials');
const { AccessToken } = require('twilio');

function createAccessToken(identity, options) {
  options = options || {};
  const accessTokenGenerator = new AccessToken(
    credentials.accountSid,
    credentials.apiKeySid,
    credentials.apiKeySecret,
    options);
  accessTokenGenerator.identity = identity;
  accessTokenGenerator.addGrant(new AccessToken.VideoGrant());
  return accessTokenGenerator.toJwt();
}

module.exports = createAccessToken;
