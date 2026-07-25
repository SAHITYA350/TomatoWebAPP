function resolveApiBase(port: number): string {
  if (typeof window === "undefined") {
    return `http://localhost:${port}`;
  }

  const { hostname, protocol } = window.location;

  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return `${protocol}//localhost:${port}`;
  }

  // Production Render microservice mappings
  switch (port) {
    case 5000: return "https://tomato-auth-king.onrender.com";
    case 5001: return "https://restaurant-service-fjfm.onrender.com";
    case 5002: return "https://utils-service-bs2f.onrender.com";
    case 5004: return "https://realtime-service-kmak.onrender.com";
    case 5005: return "https://rider-service-9yei.onrender.com";
    case 5006: return "https://admin-service-voy1.onrender.com";
    case 5007: return "https://reels-service-xvji.onrender.com";
    default:
      if (protocol === "https:") {
        return `${protocol}//${hostname}`;
      }
      return `${protocol}//${hostname}:${port}`;
  }
}

export const authService = resolveApiBase(5000);
export const restaurantService = resolveApiBase(5001);
export const utilsService = resolveApiBase(5002);
export const realtimeService = resolveApiBase(5004);
export const riderService = resolveApiBase(5005);
export const adminService = resolveApiBase(5006);
export const reelsService = resolveApiBase(5007);
