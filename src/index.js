import axios from 'axios';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';

const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://www.instagram.com/';
const CHROME_WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36'
const STORIES_UA = 'Instagram 123.0.0.21.114 (iPhone; CPU iPhone OS 11_4 like Mac OS X; en_US; en-US; scale=2.00; 750x1334) AppleWebKit/605.1.15'
const MEDIA_QUERY_URL = `https://www.instagram.com/graphql/query/?query_hash=42323d64886122307be10013ad2dcc44&variables=`;
const MEDIA_QUERY_VAR = `{"id":"{id}","first":{pagesize},"after":"{next}"}`;

const cache = {};
const app = express();
app.use(cors());

app.get('/', (req, res) => {
  fetchTimelineMedia().then(response => res.json(response.data));
});

app.listen(PORT, () =>
  console.log(`Inscraper app listening on port ${PORT}!`),
);

async function fetchTimelineMedia() {
  const igAuth = await _loadAndCacheIgAuth();
  const mediaQueryVar = MEDIA_QUERY_VAR.replace('{id}', '49092777748').replace('{pagesize}', 50).replace('{next}', '');
  return await axios.get(MEDIA_QUERY_URL + mediaQueryVar, {
    headers: {
      'Referer': BASE_URL,
      'User-Agent': CHROME_WIN_UA,
      'X-CSRFToken': igAuth.csrfToken,
      'Cookie': _buildCookieHeader(igAuth.cookies)
    }
  });
}

async function _loadAndCacheIgAuth() {
  var isIgAuthCached = cache.igAuth && cache.igAuth.csrfToken && cache.igAuth.cookies && cache.igAuth.authUser && cache.igAuth.expires;
  if (!isIgAuthCached || new Date() > new Date(cache.igAuth.expires)) {
    const loginResponse = await authenticate();
    cache.igAuth = {};
    cache.igAuth.csrfToken = loginResponse.csrfToken;
    cache.igAuth.cookies = loginResponse.cookies;
    cache.igAuth.authUser = loginResponse.authUser;
    if (loginResponse.csrfToken['Max-Age']) {
      var nowInSecond = Math.floor( new Date() / 1000 );
      var expireInSecond = Number(nowInSecond) + Number(loginResponse.csrfToken['Max-Age']);
      var expireInDate = new Date(0);
      expireInDate.setUTCSeconds(expireInSecond);
      cache.igAuth.expires = expireInDate.toUTCString();
    } else {
      cache.igAuth.expires = new Date(loginResponse.csrfToken.expires).toUTCString();
    }
    console.log(`Making new auth request and caching the response..`);
  }
  console.log(`IG authenticate data: `, JSON.stringify(cache.igAuth));
  return cache.igAuth;
}

async function authenticate() {
  const tokenResponse = await fetchCsrfToken();
  const authenticateResponse = await axios.post('https://www.instagram.com/accounts/login/ajax/', _buildAuthenticateParams(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': BASE_URL,
      'User-Agent': STORIES_UA,
      'X-CSRFToken': tokenResponse.csrfToken.value,
      'Cookie': _buildCookieHeader(tokenResponse.cookies)
    }    
  });
  if (authenticateResponse.status == 200) {
    if (true === authenticateResponse.data.authenticated) {
      const cookiesEntries = _retrieveCookieEntries(authenticateResponse.headers['set-cookie']);
      const csrfToken = _getCookieEntryByName(cookiesEntries, 'csrftoken');
      return {
        cookies: cookiesEntries,
        csrfToken: csrfToken,
        authUser: authenticateResponse.data
      }
    }
  }
  throw new Error('Error when authenticating to Instagram');
}

async function fetchCsrfToken() {
  const fetchCookieResponse = await axios.get(BASE_URL, {
    headers: {
      'Referer': BASE_URL,
      'User-Agent': STORIES_UA
    }
  });
  if (fetchCookieResponse.status === 200) {
    const cookiesEntries = _retrieveCookieEntries(fetchCookieResponse.headers['set-cookie']);
    const csrfToken = _getCookieEntryByName(cookiesEntries, 'csrftoken');
    if (cookiesEntries.length > 0 && csrfToken) {
      return {
        cookies: cookiesEntries,
        csrfToken: csrfToken
      }
    }
  }
  throw new Error('Error when fetching CSRF token.');
}

function _buildCookieHeader(cookieEntries, includeEntries) {
  var filterEntries = cookieEntries;
  if (includeEntries && Array.isArray(includeEntries) && includeEntries.length > 0) {
    filterEntries = cookieEntries.filter(item => includeEntries.includes(item.name))
  }
  return filterEntries.map(item => item.nameValuePair).join(';');
}

function _getCookieEntryByName(cookieEntries, cookieName) {
  return cookieEntries.find(item => item.name === cookieName);
}

function _retrieveCookieEntries(cookieStrs) {
  var result = [];
  if (cookieStrs) {
    if (Array.isArray(cookieStrs)) {
      for(var i = 0; i < cookieStrs.length; i++) {
        result.push(_buildCookieEntry(cookieStrs[i]));
      }
    } else {
      result.push(_buildCookieEntry(cookieStrs));
    }
  }
  return result;
}

function _buildCookieEntry(cookieStr) {
  var cookieAttrs = cookieStr.split(';');
  var entry = {
    nameValuePair: cookieAttrs[0]
  };
  for (var j = 0; j < cookieAttrs.length; j++) {
    var cookieAttrPairs = cookieAttrs[j].split('=');
    if (j == 0) {
      entry[`name`] = cookieAttrPairs[0];
      entry[`value`] = cookieAttrPairs[1];
    } else {
      entry[`${cookieAttrPairs[0].trim()}`] = cookieAttrPairs[1];
    }
  }
  return entry;
}

function _buildAuthenticateParams() {
  const time = Math.floor(Date.now() / 1000);
  var params = new URLSearchParams();
  params.append('username', `${process.env.IG_USER}`);
  params.append('enc_password', `#PWD_INSTAGRAM_BROWSER:0:${time}:${process.env.IG_PASS}`);
  params.append('queryParams', '{}');
  params.append('optIntoOneTap', 'false');
  params.append('stopDeletionNonce', '');
  params.append('trustedDeviceRecords', '');
  return params;
}
