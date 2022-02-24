import axios from 'axios';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import * as MediaService from "./mediaService.js";
import * as Utility from "./utility.js";

const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://www.instagram.com/';
const CHROME_WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36'
const STORIES_UA = 'Instagram 123.0.0.21.114 (iPhone; CPU iPhone OS 11_4 like Mac OS X; en_US; en-US; scale=2.00; 750x1334) AppleWebKit/605.1.15'
const MEDIA_QUERY_URL = BASE_URL + `graphql/query/?query_hash=42323d64886122307be10013ad2dcc44&variables=`;
const MEDIA_QUERY_VAR = `{"id":"{id}","first":{pagesize},"after":"{next}"}`;
const USER_INFO_URL = BASE_URL + '{username}/?__a=1'
const PAGE_SIZE = 50;

const cache = {};
const app = express();
app.use(cors());
app.use(express.json());

app.post('/auth-caching', (req, res) => {
  if (req.query.strategy === 'clean-first') {
    cache.igAuth = {};
  }
  var isValidCache = req.body && req.body.csrfToken && req.body.cookies && req.body.authUser && req.body.expires;
  if (isValidCache && new Date() < new Date(req.body.expires)) {
    cache.igAuth = req.body;
    res.json(cache.igAuth);
  } else {
    _loadAndCacheIgAuth().then(igAuth => res.json(igAuth)).catch(error => {
      console.error(`Unable to perform IG authentication. Try again later.`, error);
      res.sendStatus(503);
    });
  } 
});

app.get('/users/:id', (req, res) => {
  getTimelineMedia(req.params.id, req.query)
    .then(response => res.json(response));
});

app.listen(PORT, () =>
  console.log(`Inscraper app listening on port ${PORT}!`),
);

async function fetchUserInfo(igAuth, username) {
  const userInfoUrl = USER_INFO_URL.replace('{username}', username);
  const userInfoResponse = await axios.get(userInfoUrl, {
    headers: {
      'Referer': BASE_URL,
      'User-Agent': CHROME_WIN_UA,
      'X-CSRFToken': igAuth.csrfToken,
      'Cookie': Utility._buildCookieHeader(igAuth.cookies)
    }
  }); 
  const user = userInfoResponse.data;
  return {
    id: user.graphql.user.id,
    username: user.graphql.user.username,
    name: user.graphql.user.full_name,
    profile_pic: user.graphql.user.profile_pic_url_hd,
    timeline_media_count: user.graphql.user.edge_owner_to_timeline_media.count,
  };
}

async function getTimelineMedia(username, queryParams) {
  const igAuth = await _loadAndCacheIgAuth();
  const user = await fetchUserInfo(igAuth, username);
  const desiredMediaCount = Utility._calculateDesiredMediaCount(user, queryParams);
  const timelineMedias = await _fetchTimelineMedia(igAuth, user, desiredMediaCount);
  return {
    user: user,
    timelineMediaDesiredCount: desiredMediaCount,
    timelineMedias: timelineMedias
  }
}

async function _fetchTimelineMedia(igAuth, user, desiredMediaCount) {
  var medias = new Array();
  var hasNext = true, next = '', fetchCount = 0;
  while (hasNext && fetchCount < desiredMediaCount) {
    var mediaQueryParams = MEDIA_QUERY_VAR.replace('{id}', user.id)
      .replace('{pagesize}', PAGE_SIZE).replace('{next}', next);
    var response = await axios.get(MEDIA_QUERY_URL + mediaQueryParams, {
      headers: {
        'Referer': BASE_URL,
        'User-Agent': CHROME_WIN_UA,
        'X-CSRFToken': igAuth.csrfToken,
        'Cookie': Utility._buildCookieHeader(igAuth.cookies)
      }
    });

    if (response.status !== 200) {
      // Any request not success will return empty for all.
      return [];
    }

    var timelineMedia = response.data.data.user.edge_owner_to_timeline_media;
    var edges = timelineMedia.edges;
    for(var i = 0; i < edges.length; i++) {
      try {
        var edgeMedias = await MediaService.buildMedia(igAuth, edges[i]);
        medias.concat(edgeMedias);
        fetchCount++;
        if (fetchCount >= desiredMediaCount) {
          return medias;
        }
      } catch (error) {
        // Any request not success will return empty for all.
        console.error(`Build media fail for ${edges[i].node.shortcode}`, error);
        return [];
      }
    }
    hasNext = timelineMedia.page_info.has_next_page; 
    next = timelineMedia.page_info.end_cursor;
  }
  return medias;
}

async function _loadAndCacheIgAuth() {
  var isIgAuthCached = cache.igAuth && cache.igAuth.csrfToken && cache.igAuth.cookies && cache.igAuth.authUser && cache.igAuth.expires;
  if (!isIgAuthCached || new Date() > new Date(cache.igAuth.expires)) {
    const loginResponse = await _authenticate();
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

async function _authenticate() {
  const tokenResponse = await _fetchCsrfToken();
  const authenticateResponse = await axios.post('https://www.instagram.com/accounts/login/ajax/', _buildAuthenticateParams(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': BASE_URL,
      'User-Agent': STORIES_UA,
      'X-CSRFToken': tokenResponse.csrfToken.value,
      'Cookie': Utility._buildCookieHeader(tokenResponse.cookies)
    }    
  });
  if (authenticateResponse.status == 200) {
    if (true === authenticateResponse.data.authenticated) {
      const cookiesEntries = Utility._retrieveCookieEntries(authenticateResponse.headers['set-cookie']);
      const csrfToken = Utility._getCookieEntryByName(cookiesEntries, 'csrftoken');
      return {
        cookies: cookiesEntries,
        csrfToken: csrfToken,
        authUser: authenticateResponse.data
      }
    }
  }
  throw new Error('Error when authenticating to Instagram');
}

async function _fetchCsrfToken() {
  const fetchCookieResponse = await axios.get(BASE_URL, {
    headers: {
      'Referer': BASE_URL,
      'User-Agent': STORIES_UA
    }
  });
  if (fetchCookieResponse.status === 200) {
    const cookiesEntries = Utility._retrieveCookieEntries(fetchCookieResponse.headers['set-cookie']);
    const csrfToken = Utility._getCookieEntryByName(cookiesEntries, 'csrftoken');
    if (cookiesEntries.length > 0 && csrfToken) {
      return {
        cookies: cookiesEntries,
        csrfToken: csrfToken
      }
    }
  }
  throw new Error('Error when fetching CSRF token.');
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


