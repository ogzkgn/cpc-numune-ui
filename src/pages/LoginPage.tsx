import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuthStore } from "../state/useAuthStore";
import { useAppStore } from "../state/useAppStore";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const setActiveRole = useAppStore((state) => state.setActiveRole);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setActiveRole(user.role);
      const target = (location.state as any)?.from?.pathname ?? "/";
      navigate(target, { replace: true });
    }
  }, [user, navigate, location.state, setActiveRole]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!email.trim() || !password) {
      setFormError("E-posta ve şifre zorunlu");
      return;
    }
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Giriş başarısız");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md">
        <div className="space-y-6 p-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">CPC Planlama</p>
            <h1 className="text-xl font-semibold text-slate-900">Giriş Yap</h1>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              E-posta
              <input
                type="email"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/30"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ornek@laboratuvar.com"
                autoComplete="username"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Şifre
              <input
                type="password"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/30"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>
            {(formError || error) && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError || error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
