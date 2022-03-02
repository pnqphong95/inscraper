export function edgeToMedia(edge) {
  return {
    id: edge.node.id,
    type: edge.node.__typename,
    shortcode: edge.node.shortcode,
    taken_at_timestamp: edge.node.taken_at_timestamp,
    source: edge.node.display_url,
    fulfilled_source: 'GraphImage' === edge.node.__typename
  };
}

export function mediaView(viewData) {
  var result = [];
  if (viewData && viewData.items) {
    const media = viewData.items[0];
    const carousel = media.carousel_media;
    const video_versions = media.video_versions;
    if (carousel && carousel.length > 0) {
      for (var i = 0; i < carousel.length; i++) {
        result.push({
          id: carousel[i].id, origin: media.pk, type: 'GraphSidecar', shortcode: media.code,
          taken_at_timestamp: media.taken_at,
          source: carousel[i].image_versions2.candidates[0].url,
          fulfilled_source: true
        });
      }
    } else if (video_versions && video_versions.length > 0) {
      result.push({
        id: media.pk, origin: media.pk, type: 'GraphVideo', shortcode: media.code,
        taken_at_timestamp: media.taken_at,
        source: video_versions[0].url,
        fulfilled_source: true
      });
    }
  }
  return result;
}

export function buildSidecarItems(edge, mediaDetail) {
  var result = [];
  if (mediaDetail && mediaDetail.items) {
    var items = mediaDetail.items[0].carousel_media;
    for (var i = 0; i < items.length; i++) {
      result.push({
        id: edge.node.id,
        type: edge.node.__typename,
        shortcode: items[i].code,
        taken_at_timestamp: items[i].taken_at,
        source: items[i].image_versions2.candidates[0].url
      });
    }
  }
  return result;
}

export function buildVideo(edge, mediaDetail) {
  if (mediaDetail && mediaDetail.items) {
    return [{
      id: edge.node.id,
      type: edge.node.__typename,
      shortcode: edge.node.shortcode,
      taken_at_timestamp: edge.node.taken_at_timestamp,
      source: mediaDetail.items[0].video_versions[0].url
    }];
  }
  return [];
}