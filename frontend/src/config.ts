function resolveApiBase(port: number): string {
  if (typeof window === "undefined") {
    return `http://localhost:${port}`;
  }

  const { hostname, protocol } = window.location;

  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return `${protocol}//localhost:${port}`;
  }

  if (protocol === "https:") {
    return `${protocol}//${hostname}`;
  }

  return `${protocol}//${hostname}:${port}`;
}

export const authService = resolveApiBase(5000);
export const restaurantService = resolveApiBase(5001);
export const utilsService = resolveApiBase(5002);
export const realtimeService = resolveApiBase(5004);
export const riderService = resolveApiBase(5005);
export const adminService = resolveApiBase(5006);
export const reelsService = resolveApiBase(5007);
