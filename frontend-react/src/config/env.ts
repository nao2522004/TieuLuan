interface AppEnv {
  apiBaseUrl: string;
}

function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `Thiếu biến môi trường bắt buộc: ${key}. Kiểm tra file .env (xem .env.example).`,
    );
  }
  return value;
}

export const env: AppEnv = {
  apiBaseUrl: requireEnv("VITE_API_BASE_URL"),
};
