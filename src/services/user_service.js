import axios from 'axios';
import { ApiError } from '../api_error.js';
import * as Constant from '../constant.js';
import { edgeToMedia } from '../helpers/media_builder.js';

export class UserService {
  
  constructor(csrfToken, cookieStr) {
    this.csrfToken = csrfToken;
    this.cookieStr = cookieStr;
  }

  async getUserInfomation(authUsername, username) {
    const userInfoUrl = Constant.USER_INFO_URL.replace('{username}', username);
    try {
      const headers = _genericHeaders(this.csrfToken, this.cookieStr);
      const response = await axios.get(userInfoUrl, { headers });
      console.log(`Get user information from ${userInfoUrl}`);
      if (response.status === 200) {
        const graphql = response.data.graphql;
        if (graphql && graphql.user) {
          return {
            auth_username: authUsername,
            id: graphql.user.id,
            username: graphql.user.username,
            is_private: graphql.user.is_private,
            followed_by_auth_user: graphql.user.followed_by_viewer,
            name: graphql.user.full_name,
            timeline_media_count: graphql.user.edge_owner_to_timeline_media.count,
          };
        }
      } else {
        console.log(`Status ${response.status} when get user infomation from url: ${userInfoUrl}`);
      }
    } catch (error) {
      console.log(`Status ${error.response.status}:${error.response.statusMessage} when get user infomation from url: ${userInfoUrl}`);
    }
    return {};
  }

  async getMediasByDesiredCount(user, desiredCount) {
    const userId = user.id;
    const result = [];
    if (!user.followed_by_auth_user && user.is_private) return result;
    const headers = _genericHeaders(this.csrfToken, this.cookieStr);
    var hasNext = true, next = '', fetchCount = 0;
    while (hasNext && fetchCount < desiredCount) {
      const url = Constant.MEDIA_QUERY_URL + _mediaQueryParams(userId, next);
      try {
        const response = await axios.get(url, { headers });
        console.log(`${user.username}: Receive media response from ${url}`);
        if (response.status !== 200) {
          console.log(`Status ${response.status} when get user medias from url: ${url}`);
          return [];
        }
        const timelineMedia = response.data.data.user.edge_owner_to_timeline_media;
        const edges = timelineMedia.edges;
        for(var i = 0; i < edges.length; i++) {
          result.push(edgeToMedia(edges[i]));
          fetchCount++;
          if (fetchCount >= desiredCount) {
            return result;
          }
        }
        hasNext = timelineMedia.page_info.has_next_page; 
        next = timelineMedia.page_info.end_cursor;
      } catch (error) {
        if (error.response) {
          console.log(`Status ${error.response.status}:${error.response.statusMessage} when get user medias from url: ${url}`);
        } else {
          console.log(`Error when get user medias from url: ${url}`, error);
        }

        return [];
      }
    }
    return result;
  }

}

function _genericHeaders(csrfToken, cookieStr) {
  return {
    'Referer': Constant.BASE_URL,
    'User-Agent': Constant.CHROME_WIN_UA,
    'X-CSRFToken': csrfToken,
    'Cookie': cookieStr
  }
}

function _mediaQueryParams(userId, next) {
  return Constant.MEDIA_QUERY_VAR.replace('{id}', userId).replace('{pagesize}', Constant.PAGE_SIZE).replace('{next}', next);
}