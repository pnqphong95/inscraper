import axios from 'axios';
import * as Constant from '../constant.js';
import { mediaView } from '../helpers/media_builder.js';

export class MediaService {

  constructor(csrfToken, cookieStr) {
    this.csrfToken = csrfToken;
    this.cookieStr = cookieStr;
  }

  async viewMedias(shortcodes, acceptTimeout) {
    const result = { startTime: new Date(), data: {}, remains: [] };
    const headers = _genericHeaders(this.csrfToken, this.cookieStr);
    const viewMediaObjs = shortcodes.map(code => {
      return { code, url: Constant.VIEW_MEDIA_URL.replace('{code}', code) };
    });
    var objProcesseds = [], startUrl = 0, endUrl = Math.min(viewMediaObjs.length, Constant.VIEW_MEDIA_CONCURRENT);
    while (objProcesseds.length < viewMediaObjs.length) {

      if (_timeoutReached(result.startTime, acceptTimeout)) {
        const notProcesseds = viewMediaObjs.filter(item => !objProcesseds.includes(item)).map(item => item.code);
        result.remains = result.remains.concat(notProcesseds);
        console.log(`Timeout reached. Remaining urls with be response back!`);
        break;
      }

      const workingObjs = viewMediaObjs.slice(startUrl, endUrl);
      try {
        var responses = await Promise.all(workingObjs.map(obj => axios.get(obj.url, { headers })));
        for(var i = 0; i < responses.length; i++) {
          if (responses[i].status === 200) {
            const childMedias = mediaView(responses[i].data);
            if (childMedias.length > 0) {
              result.data[childMedias[0].origin] = childMedias;
            }
          } else {
            result.remains.push(workingObjs[i].code);
          }
        }
      } catch (error) {
        const codes = workingObjs.map(item => item.code);
        console.log(`Error when view media ${JSON.stringify(codes)}`, error);
        result.remains = result.remains.concat(codes);
      } finally {
        objProcesseds = objProcesseds.concat(workingObjs);
      }

      startUrl = startUrl + workingObjs.length;
      endUrl = Math.min(viewMediaObjs.length, endUrl + workingObjs.length);
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

function _timeoutReached(start, timeoutInSecond) {
  const timeout = timeoutInSecond * 1000;
  const startTime = start.getTime();
  const now = new Date().getTime();
  const execTime = Math.abs(now - startTime);
  if (execTime > timeout) {
    return true;
  }
  return false;
}