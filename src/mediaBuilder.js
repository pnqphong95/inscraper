export function buildImage(edge) {
  return [{
    id: edge.node.id,
    type: edge.node.__typename,
    shortcode: edge.node.shortcode,
    taken_at_timestamp: edge.node.taken_at_timestamp,
    caption: edge.node.edge_media_to_caption,
    source: edge.node.display_url
  }];
}

export function buildSidecarItems(edge, mediaDetail) {
  var result = [];
  var items = mediaDetail.items[0].carousel_media;
  for(var i = 0; i < items.length; i++) {
    result.push({
      id: edge.node.id,
      type: edge.node.__typename,
      shortcode: edge.node.shortcode,
      taken_at_timestamp: edge.node.taken_at_timestamp,
      caption: edge.node.edge_media_to_caption,
      source: items[i].image_versions2.candidates[0].url
    });
  }
  return result;
}

export function buildVideo(edge, mediaDetail) {
  return [{
    id: edge.node.id,
    type: edge.node.__typename,
    shortcode: edge.node.shortcode,
    taken_at_timestamp: edge.node.taken_at_timestamp,
    caption: edge.node.edge_media_to_caption,
    source: mediaDetail.items[0].video_versions[0].url
  }];
}