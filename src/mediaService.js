import * as MediaBuilder from "./mediaBuilder.js";
import * as Utility from "./utility.js";
import axios from 'axios';

export async function buildMedia(igAuth, edge) {
  switch (edge.node.__typename) {
    case 'GraphImage':
      return MediaBuilder.buildImage(edge);
    case 'GraphVideo':
      return _fetchAndBuildVideo(igAuth, edge);
    case 'GraphSidecar':
      return _fetchAndBuildSidecar(igAuth, edge);
    default:
      return [];
  }
}

async function _fetchAndBuildSidecar(igAuth, edge) {
  var mediaDetail = await _fetchMediaDetail(igAuth, edge);
  return MediaBuilder.buildSidecarItems(edge, mediaDetail);
}

async function _fetchAndBuildVideo(igAuth, edge) {
  var mediaDetail = await _fetchMediaDetail(igAuth, edge);
  return MediaBuilder.buildVideo(edge, mediaDetail);
}

async function _fetchMediaDetail(igAuth, edge) {
  var viewMediaUrl = 'https://www.instagram.com/p/{code}/?__a=1'.replace('{code}', edge.node.shortcode);
  var response = await axios.get(viewMediaUrl, {
    headers: {
      'Referer': 'https://www.instagram.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36',
      'X-CSRFToken': igAuth.csrfToken,
      'Cookie': Utility._buildCookieHeader(igAuth.cookies)
    }
  });
  return response.data;
}