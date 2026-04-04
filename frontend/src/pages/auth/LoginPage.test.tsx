import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./LoginPage";

// Mock auth API
vi.mock("@/api/auth", () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
  },
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { authApi } from "@/api/auth";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
  }

  it("ログインフォームが表示される", () => {
    renderPage();
    expect(screen.getByText("ServiceHub 工事管理")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  it("メールアドレスを入力できる", () => {
    renderPage();
    const emailInput = screen.getByLabelText("メールアドレス");
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    expect(emailInput).toHaveValue("user@example.com");
  });

  it("パスワードを入力できる", () => {
    renderPage();
    const passwordInput = screen.getByLabelText("パスワード");
    fireEvent.change(passwordInput, { target: { value: "secret" } });
    expect(passwordInput).toHaveValue("secret");
  });

  it("ログイン成功時に /dashboard へ遷移する", async () => {
    vi.mocked(authApi.login).mockResolvedValue({ access_token: "token123" });
    vi.mocked(authApi.me).mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      full_name: "テスト ユーザー",
      role: "user",
    });

    renderPage();

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("ログイン失敗時にエラーメッセージが表示される", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error("Unauthorized"));

    renderPage();

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "bad@example.com" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(
        screen.getByText("メールアドレスまたはパスワードが正しくありません"),
      ).toBeInTheDocument();
    });
  });

  it("送信中はボタンが無効化される", async () => {
    // Keep login pending
    vi.mocked(authApi.login).mockImplementation(() => new Promise(() => {}));

    renderPage();

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(screen.getByText("ログイン中...")).toBeInTheDocument();
    });
  });
});
