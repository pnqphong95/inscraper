export function edgeToMedia(edge) {
  const captionEdges = edge.node.edge_media_to_caption.edges;
  return {
    id: `${edge.node.id}`,
    type: edge.node.__typename,
    shortcode: edge.node.shortcode,
    taken_at_timestamp: edge.node.taken_at_timestamp,
    caption: captionEdges && captionEdges.length > 0 ? captionEdges[0].node.text : '',
    source: edge.node.display_url,
    fulfilled_source: 'GraphImage' === edge.node.__typename,
    classified: false
  };
}

export function mediaView(viewData) {
  var result = [];
  if (viewData && viewData.items) {
    const media = viewData.items[0];
    const parentId = media.id.split('_')[0];
    const carousel = media.carousel_media;
    const video_versions = media.video_versions;
    if (carousel && carousel.length > 0) {
      for (var i = 0; i < carousel.length; i++) {
        result.push({
          id: `${carousel[i].id}`, origin: `${parentId}`, type: 'GraphSidecar', shortcode: media.code,
          taken_at_timestamp: media.taken_at,
          caption: media.caption ? media.caption.text : '',
          source: carousel[i].image_versions2.candidates[0].url,
          fulfilled_source: true,
          classified: false
        });
      }
    } else if (video_versions && video_versions.length > 0) {
      result.push({
        id: `${media.id}`, origin: `${parentId}`, type: 'GraphVideo', shortcode: media.code,
        taken_at_timestamp: media.taken_at,
        caption: media.caption ? media.caption.text : '',
        source: video_versions[0].url,
        fulfilled_source: true,
        classified: false
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