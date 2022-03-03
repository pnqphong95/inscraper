import axios from 'axios';
import _ from 'lodash';
import { ApiError } from '../api_error.js';
import * as Constant from '../constant.js';
import * as CookieHelper from '../helpers/cookie_helper.js';

export class IgAuthService {

  constructor() {}

  async authenticate({username, password}) {
    const cookies = await this.getCookies();
    const credentials = _parseOrLoadCredentials({username, password});
    if (credentials.username && credentials.password) {
      const headers = _authenticateHeaders(Constant.BASE_URL, Constant.STORIES_UA, cookies);
      const response = await axios.post(Constant.AUTH_URL, _authenticateParams(credentials), { headers });
      if (response.status === 200 && true === response.data.authenticated) {
        const authCookies = CookieHelper.retrieveCookieEntries(response.headers['set-cookie']);
        const cookieString = CookieHelper.buildHeader(authCookies);
        const csrfToken = CookieHelper.getCookieByName(authCookies, 'csrftoken');
        return {
          'userId': response.data.userId,
          'username': credentials.username,
          'active': true,
          'requestCookie': cookieString, 
          'csrfToken': csrfToken['value'],
          'expires': csrfToken['expires'],
          'Max-Age': csrfToken['Max-Age']
        }
      }
      throw new ApiError('Error when authenticating to Instagram. Please check credentials and try again.', 500);
    }
    throw new ApiError('Either request or environment credentials is not provided.', 400);
  }

  async getCookies() {
    const headers = { 'Referer': Constant.BASE_URL, 'User-Agent': this.MOBILE_AGENT }
    const response = await axios.get(Constant.BASE_URL, { headers });
    if (response.status === 200) {
      return CookieHelper.retrieveCookieEntries(response.headers['set-cookie']);
    }
    throw new ApiError('Error when fetching CSRF token. Try again later', 500);
  }

}

function _parseOrLoadCredentials({username, password}) {
  if (!username) {
    return _.sample(_getEnvCredentials());
  }
  if (password) {
    return {username, password};
  }
  const credentials = _getEnvCredentials().find(item => item.username === username);
  if (credentials) {
    return credentials;
  }
  throw new ApiError(`Environment credentials for ${username} is not provided.`, 400);
}

function _getEnvCredentials() {
  const envUsers = process.env.IG_USER;
  const envPasses = process.env.IG_PASS;
  const usernameArray = envUsers.split(';');
  const passwordArray = envPasses.split(';');
  if (usernameArray[0] == envUsers && passwordArray[0] === envPasses) {
    return [{ username: envUsers, password: envPasses }]
  }

  if (Array.isArray(usernameArray) && Array.isArray(passwordArray) && usernameArray.length === passwordArray.length) {
      const result = [];
      for(var i = 0; i < usernameArray.length; i++) {
        result.push({ username: usernameArray[i], password: passwordArray[i] });
      }
      return result;
  }
  throw new Exception('Environment credentials is invalid or not configured!', 400);
}

function _authenticateHeaders(baseUrl, agent, cookies) {
  return {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': baseUrl,
    'User-Agent': agent,
    'X-CSRFToken': CookieHelper.getCookieByName(cookies, 'csrftoken').value,
    'Cookie': CookieHelper.buildHeader(cookies)
  };
}

function _authenticateParams({username, password}) {
  const time = Math.floor(Date.now() / 1000);
  var params = new URLSearchParams();
  params.append('username', `${username}`);
  params.append('enc_password', `#PWD_INSTAGRAM_BROWSER:0:${time}:${password}`);
  params.append('queryParams', '{}');
  params.append('optIntoOneTap', 'false');
  params.append('stopDeletionNonce', '');
  params.append('trustedDeviceRecords', '');
  return params;
}

