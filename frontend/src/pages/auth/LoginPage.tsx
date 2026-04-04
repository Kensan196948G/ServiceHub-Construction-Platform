import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HardHat } from "lucide-react";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { Button, Card, FormField, Input } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = await authApi.login({ email, password });
      // Store token temporarily to fetch user info
      useAuthStore.setState({ token: token.access_token });
      const user = await authApi.me();
      setAuth(token.access_token, user);
      navigate("/dashboard");
    } catch {
      setError("メールアドレスまたはパスワードが正しくありません");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <HardHat className="w-12 h-12 text-primary-600" />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-gray-900">
            ServiceHub 工事管理
          </h2>
          <p className="mt-2 text-sm text-gray-600">アカウントにサインイン</p>
        </div>

        <Card className="mt-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <FormField label="メールアドレス" htmlFor="email" required>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </FormField>

              <FormField label="パスワード" htmlFor="password" required>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              ログイン
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
