export function _buildCookieHeader(cookieEntries, includeEntries) {
  var filterEntries = cookieEntries;
  if (includeEntries && Array.isArray(includeEntries) && includeEntries.length > 0) {
    filterEntries = cookieEntries.filter(item => includeEntries.includes(item.name))
  }
  return filterEntries.map(item => item.nameValuePair).join(';');
}

export function _getCookieEntryByName(cookieEntries, cookieName) {
  return cookieEntries.find(item => item.name === cookieName);
}

export function _retrieveCookieEntries(cookieStrs) {
  var result = [];
  if (cookieStrs) {
    if (Array.isArray(cookieStrs)) {
      for (var i = 0; i < cookieStrs.length; i++) {
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

export function _calculateDesiredMediaCount(user, queryParams) {
  var maximum = queryParams.maximum;
  var lastCount = queryParams.lastCount;
  var expectMediaCount;
  if (maximum && maximum > 0) {
    expectMediaCount = maximum;
  } else {
    expectMediaCount = 0;
  }
  if (!lastCount || lastCount < 0 || user.timeline_media_count <= lastCount) {
    expectMediaCount = 0;
  } else {
    expectMediaCount = user.timeline_media_count - lastCount;
  }
  return expectMediaCount;
}