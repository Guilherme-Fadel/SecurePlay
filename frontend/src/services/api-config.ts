export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

// Socket.IO's URL selects a namespace, not its HTTP transport path.
// Keep the default namespace and send polling/upgrades through the API proxy.
const apiUrl = new URL(API_BASE_URL, window.location.origin);
export const SOCKET_ORIGIN = apiUrl.origin;
export const SOCKET_PATH = `${apiUrl.pathname.replace(/\/+$/, '')}/socket.io`;
