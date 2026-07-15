import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/config/env";
import { notify } from "@/lib/notify";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";
import { useAuthStore } from "@/features/auth/stores/auth.store";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly traceId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ExtendedRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  skipGlobalErrorToast?: boolean;
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  pendingQueue = [];
}

function toApiError(err: AxiosError<ApiErrorResponse>): ApiError {
  const body = err.response?.data;
  if (body && body.success === false) {
    return new ApiError(
      body.error.code,
      body.error.message,
      err.response!.status,
      body.trace_id,
    );
  }

  return new ApiError(
    "NETWORK_ERROR",
    "Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.",
    err.response?.status ?? 0,
  );
}

apiClient.interceptors.response.use(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (response): any => response.data,

  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as ExtendedRequestConfig | undefined;
    const apiError = toApiError(error);

    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/refresh");

    if (
      apiError.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().clearSession();
        return Promise.reject(apiError);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (newToken) => {
              originalRequest._retry = true;
              originalRequest.headers.set(
                "Authorization",
                `Bearer ${newToken}`,
              );
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post<
          ApiSuccessResponse<{ access_token: string; refresh_token: string }>
        >(`${env.apiBaseUrl}/auth/refresh`, { refresh_token: refreshToken });

        const { access_token, refresh_token } = refreshResponse.data.data;
        useAuthStore.getState().setTokens(access_token, refresh_token);

        flushQueue(null, access_token);
        originalRequest.headers.set("Authorization", `Bearer ${access_token}`);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        flushQueue(refreshErr, null);
        useAuthStore.getState().clearSession();
        notify.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return Promise.reject(apiError);
      } finally {
        isRefreshing = false;
      }
    }

    if (!originalRequest?.skipGlobalErrorToast) {
      notify.error(apiError.message);
    }

    return Promise.reject(apiError);
  },
);

export function withSilentError<T extends AxiosRequestConfig>(config: T): T {
  return { ...config, skipGlobalErrorToast: true } as T;
}
