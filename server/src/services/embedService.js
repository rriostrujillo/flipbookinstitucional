export function generateEmbedCode(documentId, baseUrl) {
  const viewerUrl = `${baseUrl}/viewer?doc=${documentId}`;
  
  return `<iframe 
  src="${viewerUrl}"
  width="100%" 
  height="500" 
  frameborder="0"
  allowfullscreen
  style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);"
></iframe>`;
}

export function generateViewerUrl(documentId, baseUrl) {
  return `${baseUrl}/viewer?doc=${documentId}`;
}

export function parseEmbedCode(embedCode) {
  const urlMatch = embedCode.match(/src="([^"]+)"/);
  if (urlMatch) {
    const url = new URL(urlMatch[1]);
    return url.searchParams.get('doc');
  }
  return null;
}
