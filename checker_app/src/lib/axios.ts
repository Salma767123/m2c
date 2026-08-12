import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE_URL } from "./apiBase";

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Prioritize checkerToken as this is the Checker App
      const checkerToken = await AsyncStorage.getItem("checkerToken");
      const adminToken = await AsyncStorage.getItem("adminToken");
      const vendorToken = await AsyncStorage.getItem("vendorToken");
      const userToken = await AsyncStorage.getItem("userToken");

      const token = checkerToken || adminToken || vendorToken || userToken;

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
    const method = error.config?.method?.toUpperCase() || "REQUEST";
    // Join the way axios does. Plain concatenation reports a phantom "//" that
    // was never in the real request and sends you hunting for the wrong bug.
    const base = (error.config?.baseURL ?? "").replace(/\/+$/, "");
    const path = error.config?.url ?? "";
    const url = /^https?:\/\//i.test(path)
      ? path
      : `${base}/${path.replace(/^\/+/, "")}`;
    const reqInfo = `${method} ${url}`;

    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401: {
          const isLoginAttempt =
            error.config?.url?.includes("/auth/login") ||
            error.config?.url?.includes("/auth/admin/login") ||
            error.config?.url?.includes("/auth/vendor") ||
            error.config?.url?.includes("/vendors/login") ||
            error.config?.url?.includes("/qc-checkers/login");

          console.error(
            `API Error [401] ${reqInfo}:`,
            data?.error || data?.message || "Unauthorized",
          );

          if (!isLoginAttempt) {
            // Clear tokens from AsyncStorage
            try {
              await AsyncStorage.multiRemove([
                "adminToken",
                "vendorToken",
                "vendorData",
                "userToken",
                "userData",
                "checkerToken",
                "checkerData",
                "checkerID",
              ]);
            } catch (e) {
              console.error("Error clearing auth data:", e);
            }
          }
          break;
        }
        case 403:
          console.error(
            `Access forbidden [403] ${reqInfo}:`,
            data?.error || "Insufficient permissions",
          );
          break;
        case 404:
          console.error(
            `Resource not found [404] ${reqInfo}:`,
            data?.error || "The requested resource was not found",
          );
          break;
        case 500:
          console.error(
            `Server error [500] ${reqInfo}:`,
            data?.error || "Internal server error",
          );
          break;
        default:
          console.error(
            `API Error [${status}] ${reqInfo}:`,
            data?.error || data?.message || `HTTP ${status}`,
          );
      }

      const errorMessage = data?.error || data?.message || `HTTP ${status}`;
      return Promise.reject({ message: errorMessage, status, data });
    }

    if (error.request) {
      console.error(`Network error ${reqInfo}:`, error.message);
      return Promise.reject({
        message: "Network error. Please check your connection.",
        status: 0,
        data: null,
      });
    }

    console.error(`Request error ${reqInfo}:`, error.message);
    return Promise.reject({
      message: error.message || "Request failed",
      status: 0,
      data: null,
    });
  },
);

export default axiosInstance;
export type { AxiosResponse, InternalAxiosRequestConfig };
