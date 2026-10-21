/**
 * Resolves the visitor's IP once, at the edge, and stores it in a request header. Server-side
 * rendering calls our own API routes as internal requests, which have no socket address but copy
 * the original request headers: they get the value resolved here. Whatever a client sends in that
 * header is overwritten.
 */
export default defineEventHandler((event) => {
  const peer = event.node.req.socket.remoteAddress;
  if (!peer) return;
  event.node.req.headers[VISITOR_IP_HEADER] = resolveVisitorIp(event, peer);
});
