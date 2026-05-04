export type ApiErrorPayload = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  data: T;
  errors?: string;
  code?: string;
  success: boolean;
  total?: number;
};
