const WORKER_ORIGIN = "https://travel-manager-api.ddabdul.workers.dev";

export async function onRequest(context) {
  const { request } = context;
  const incomingUrl = new URL(request.url);
  const upstreamUrl = `${WORKER_ORIGIN}${incomingUrl.pathname}${incomingUrl.search}`;
  const upstreamRequest = new Request(upstreamUrl, request);
  return fetch(upstreamRequest);
}
