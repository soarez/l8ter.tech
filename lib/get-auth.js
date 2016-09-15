const url = require('url');
const http = require('http');
const querystring = require('querystring');
const spawn = require('child_process').spawn;

const google = require('googleapis');

const cache = require('./cache');

const {
  clientId,
  clientSecret,
  redirectUrl,
  scopes
} = global.conf;

module.exports = getAccessToken;

function getAccessToken(userId, cb) {
  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUrl
  );

  cache.get(cacheKey(userId), onCacheResult);
  function onCacheResult(err, result) {
    if (err)
      console.error(err);

    if (result)
      return withTokens(result);

    doFullFlow();
  }

  function withTokens(tokens) {
    oAuth2Client.setCredentials(tokens);
    cb(null, oAuth2Client);
  }

  function doFullFlow() {
    const oauthUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      redirect_uri: redirectUrl,
      login_hint: userId,
      // prompt: 'consent',
      scope: scopes
    });

    const server = http.createServer()
      .on('request', onRequest)
      .on('request', closeServer)
      .listen(8080, onServerReady);

    function closeServer() {
      server.close();
    }

    function onServerReady() {
      spawn('open', [oauthUrl]).on('error', function(err) {
        console.error(err);
        console.error('Could not open browser. Visit:\n', oauthUrl);
      });
    }
  }

  function onRequest(req, res) {
    const urlQuery = url.parse(req.url).query;
    const qs = querystring.parse(urlQuery);
    const code = qs.code;

    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Connection': 'close'
    });
    res.end(`
<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><title></title></head><body>
<p>These parameters were received:</p>
<pre>${JSON.stringify(qs, null, 2)}</pre>
<p>You may close this window now.</p>
</body></html>
    `);

    if (!code)
      return cb(new Error("No `code` in callback URL's query: " + urlQuery));

    oAuth2Client.getToken(code, onTokens);
  }

  function onTokens(err, tokens) {
    if (err)
      return cb(err);

    cache.save(cacheKey(userId), tokens, onSaved);

    function onSaved(err) {
      if (err)
        console.error(err);

      withTokens(tokens);
    }
  }
}

function cacheKey(userId) {
  return userId + '.token';
}

