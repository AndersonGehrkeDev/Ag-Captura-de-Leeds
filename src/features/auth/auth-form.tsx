"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { initialAuthState, type AuthFormState } from "@/domain/auth";
import { loginAction, signupAction, recoveryAction, confirmEmailAction, resetPasswordAction, logoutAction, updateProfileAction } from "@/server/auth/actions";

type Mode = "login" | "signup" | "recovery" | "confirm" | "reset" | "profile" | "logout";
const actions = { login: loginAction, signup: signupAction, recovery: recoveryAction, confirm: confirmEmailAction, reset: resetPasswordAction, profile: updateProfileAction, logout: logoutAction };
const labels = { login: "Entrar na plataforma", signup: "Solicitar cadastro", recovery: "Enviar instruções", confirm: "Confirmar e continuar", reset: "Salvar nova senha", profile: "Salvar perfil", logout: "Sair da conta" };
export function AuthForm({ mode, disabled = false, next = "/prospeccao", tokenHash = "", otpType = "", displayName = "" }: { mode: Mode; disabled?: boolean; next?: string; tokenHash?: string; otpType?: string; displayName?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(actions[mode], initialAuthState);
  return <form action={action} className="auth-form" aria-label={labels[mode]} aria-busy={pending}>
    <input type="hidden" name="next" value={next} />
    {mode === "confirm" && <><input type="hidden" name="token_hash" value={tokenHash} /><input type="hidden" name="type" value={otpType} /></>}
    <fieldset disabled={disabled || pending}>
      {["login", "signup", "recovery"].includes(mode) && <label>E-mail<input name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} required placeholder="voce@empresa.com.br" /></label>}
      {["login", "signup", "reset"].includes(mode) && <label>{mode === "reset" ? "Nova senha" : "Senha"}<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? 1 : 12} maxLength={128} aria-describedby={mode === "login" ? undefined : "password-help"} /></label>}
      {["signup", "reset"].includes(mode) && <p id="password-help" className="auth-help">Ao menos 12 caracteres, com maiúscula, minúscula e número.</p>}
      {mode === "reset" && <label>Confirme a nova senha<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>}
      {mode === "profile" && <label>Nome de exibição<input name="display_name" autoComplete="name" required maxLength={100} defaultValue={displayName} /></label>}
      {state.message && <p className={state.success ? "form-message success" : "form-message"} role={state.success ? "status" : "alert"}>{state.message}</p>}
      <Button type="submit" className="auth-submit" disabled={disabled || pending}>{pending ? "Aguarde…" : labels[mode]}</Button>
    </fieldset>
    {mode === "login" && <Link className="auth-link" href="/recuperar-senha">Esqueci minha senha</Link>}
    {mode === "reset" && state.success && <Link className="auth-link" href="/perfil">Acessar meu perfil</Link>}
  </form>;
}
