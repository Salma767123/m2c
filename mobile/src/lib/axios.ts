import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Every backend route is mounted under `/api`, while services call paths like
// `/auth/forgot-password`. Normalise the configured base so it always ends in
// exactly one `/api` — whether or not EXPO_PUBLIC_API_URL already includes it —
// otherwise requests miss the prefix and the backend returns "Route not found".
//
// This is the web's rule, ported (frontend/src/lib/axios.ts). Mobile took the
// raw env string verbatim, so a value with or without the suffix silently
// decided whether the whole API worked. It also makes the app survive a stale
// value cached into the bundle: Expo inlines EXPO_PUBLIC_* at build time, so a
// `.env` edit does not reach a running Metro without `--clear`.
const API_BASE_URL = (() => {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (!configured) {
    if (__DEV__) {
      console.warn(
        "EXPO_PUBLIC_API_URL is not set — every API call will fail. Set it in mobile/.env and restart Metro with --clear.",
      );
    }
    return undefined;
  }
  const raw = configured.replace(/\/+$/, "");
  return /\/api$/.test(raw) ? raw : `${raw}/api`;
})();

/** The normalised API base. Exported so nothing has to re-derive it from the
 *  env var and get the `/api` suffix wrong a second time. */
export { API_BASE_URL };

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Get tokens from AsyncStorage
      const userToken = await AsyncStorage.getItem("userToken");
      const adminToken = await AsyncStorage.getItem("adminToken");
      const vendorToken = await AsyncStorage.getItem("vendorToken");

      const token = adminToken || vendorToken || userToken;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting auth token:", error);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401: {
          const isLoginAttempt =
            error.config?.url?.includes("/auth/login") ||
            error.config?.url?.includes("/auth/admin/login") ||
            error.config?.url?.includes("/auth/vendor") ||
            error.config?.url?.includes("/vendors/login");

          if (!isLoginAttempt) {
            // Only clear tokens if one was actually sent with the request.
            // Avoids unnecessary AsyncStorage churn on unauthenticated startup.
            const hadToken = !!error.config?.headers?.Authorization;
            if (hadToken) {
              try {
                await AsyncStorage.multiRemove([
                  "adminToken",
                  "vendorToken",
                  "vendorData",
                  "userToken",
                  "userData",
                ]);
              } catch (e) {
                if (__DEV__) console.warn("Error clearing auth data:", e);
              }
            }
          }
          // 401 is expected for guests — use warn, not error, to avoid red-box in dev.
          if (__DEV__) console.warn("Auth 401:", error.config?.url);
          break;
        }
        case 403:
          if (__DEV__) console.warn("Access forbidden:", data?.error || "Insufficient permissions");
          break;
        case 404:
          // 404 here is usually a business outcome, not a missing route — an
          // empty cart lookup, or "no account with this email" from
          // forgot-password. Logging the bare path as "Not found" made a
          // routine answer read as a routing failure and sent a debugging
          // session after the wrong thing, so the server's message goes in too.
          if (__DEV__) {
            console.warn(`404 ${error.config?.url} —`, data?.error || "no message");
          }
          break;
        case 500:
          console.error("Server error:", data?.error || "Internal server error");
          break;
        default:
          if (__DEV__) console.warn("API Error:", data?.error || `HTTP ${status}`);
      }

      const errorMessage = data?.error || data?.message || `HTTP ${status}`;
      return Promise.reject({ message: errorMessage, status, data });
    }

    if (error.request) {
      // Network-unreachable: handled by callers (empty lists, fallbacks).
      // Avoid console.error to prevent dev red-box spam when backend is down.
      if (__DEV__) {
        console.warn(
          "Network unreachable:",
          error.config?.url || error.message,
        );
      }
      return Promise.reject({
        message: "Network error. Please check your connection.",
        status: 0,
        data: null,
      });
    }

    if (__DEV__) {
      console.warn("Request error:", error.message);
    }
    return Promise.reject({
      message: error.message || "Request failed",
      status: 0,
      data: null,
    });
  },
);

export default axiosInstance;
export type { AxiosResponse, InternalAxiosRequestConfig };
