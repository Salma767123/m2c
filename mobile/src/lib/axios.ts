import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Prefer EXPO_PUBLIC_API_URL so it's available at runtime in Expo.
// Fallback chain: env var → LAN dev IP → localhost.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

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
          // 404 is routine (e.g. empty cart lookup) — warn only in dev.
          if (__DEV__) console.warn("Not found:", error.config?.url);
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
