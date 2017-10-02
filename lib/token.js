'use strict';

const { AccessToken } = require('twilio');

function createAccessToken(identity, options) {
  options = options || {};
  const accessTokenGenerator = new AccessToken(
    process.env.ACCOUNT_SID,
    process.env.API_KEY_SID,
    process.env.API_KEY_SECRET,
    options);
  accessTokenGenerator.identity = identity;
  accessTokenGenerator.addGrant(new AccessToken.VideoGrant());
  return accessTokenGenerator.toJwt();
}

module.exports = createAccessToken;
