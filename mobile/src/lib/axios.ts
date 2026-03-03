import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

const axiosInstance: AxiosInstance = axios.create({
  baseURL:
    process.env.API_URL || "http://192.168.29.32:5000/api" || "http://192.168.29.33:5000/api",
  timeout: 10000,
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
      console.error('Error getting auth token:', error);
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
            // Clear tokens from AsyncStorage
            try {
              await AsyncStorage.multiRemove([
                "adminToken",
                "vendorToken",
                "vendorData",
                "userToken",
                "userData"
              ]);
            } catch (e) {
              console.error('Error clearing auth data:', e);
            }
          }
          break;
        }
        case 403:
          console.error(
            "Access forbidden:",
            data?.error || "Insufficient permissions",
          );
          break;
        case 404:
          console.error(
            "Resource not found:",
            data?.error || "The requested resource was not found",
          );
          break;
        case 500:
          console.error(
            "Server error:",
            data?.error || "Internal server error",
          );
          break;
        default:
          console.error("API Error:", data?.error || `HTTP ${status}`);
      }

      const errorMessage = data?.error || data?.message || `HTTP ${status}`;
      return Promise.reject({ message: errorMessage, status, data });
    }

    if (error.request) {
      console.error("Network error:", error.message);
      return Promise.reject({
        message: "Network error. Please check your connection.",
        status: 0,
        data: null,
      });
    }

    console.error("Request error:", error.message);
    return Promise.reject({
      message: error.message || "Request failed",
      status: 0,
      data: null,
    });
  },
);

export default axiosInstance;
export type { AxiosResponse, InternalAxiosRequestConfig };

