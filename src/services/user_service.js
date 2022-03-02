import axios from 'axios';
import { ApiError } from '../api_error.js';
import * as Constant from '../constant.js';
import { edgeToMedia } from '../helpers/media_builder.js';

export class UserService {
  
  constructor(csrfToken, cookieStr) {
    this.csrfToken = csrfToken;
    this.cookieStr = cookieStr;
  }

  async getUserInfomation(username) {
    const userInfoUrl = Constant.USER_INFO_URL.replace('{username}', username);
    const headers = _genericHeaders(this.csrfToken, this.cookieStr);
    const response = await axios.get(userInfoUrl, { headers });
    try {
      if (response.status === 200) {
        const graphql = response.data.graphql;
        if (graphql && graphql.user) {
          return {
            id: graphql.user.id,
            username: graphql.user.username,
            name: graphql.user.full_name,
            timeline_media_count: graphql.user.edge_owner_to_timeline_media.count,
          };
        }
      } else {
        throw new ApiError(`${username}: Unable to get user infomation.`, response.status, response.data);
      }
    } catch (error) {
      throw new ApiError(`${username}: Unable to get user infomation.`, error.response.status, error.response.data);
    }
  }

  async getMediasByDesiredCount(userId, desiredCount) {
    const result = [];
    const headers = _genericHeaders(this.csrfToken, this.cookieStr);
    var hasNext = true, next = '', fetchCount = 0;
    while (hasNext && fetchCount < desiredCount) {
      const mediaQueryParams = _mediaQueryParams(userId, next);
      try {
        const response = await axios.get(Constant.MEDIA_QUERY_URL + mediaQueryParams, { headers });
        if (response.status !== 200) {
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
      } catch (error) {
        console.log(`${username}: Unable to get user infomation, return ${error.response.status}`);
        console.log(error.response.data);
        return [];
      }
      hasNext = timelineMedia.page_info.has_next_page; 
      next = timelineMedia.page_info.end_cursor;
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