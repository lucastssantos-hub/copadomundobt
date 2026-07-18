"use client";

import { useActionState } from "react";
import { useState } from "react";
import { signInAction, signUpAction, type AuthState } from "./actions";

const initialState: AuthState = {};

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInFormAction, signInPending] = useActionState(signInAction, initialState);
  const [signUpState, signUpFormAction, signUpPending] = useActionState(signUpAction, initialState);
  const isSignUp = mode === "signup";
  const state = isSignUp ? signUpState : signInState;
  const pending = isSignUp ? signUpPending : signInPending;

  return (
    <div className="auth-flow">
      <div className="auth-switch" role="tablist" aria-label="Acesso à conta">
        <button type="button" role="tab" aria-selected={!isSignUp} className={!isSignUp ? "auth-switch-active" : ""} onClick={() => setMode("signin")}>Entrar</button>
        <button type="button" role="tab" aria-selected={isSignUp} className={isSignUp ? "auth-switch-active" : ""} onClick={() => setMode("signup")}>Criar conta</button>
      </div>

      <form action={isSignUp ? signUpFormAction : signInFormAction} className="auth-form-card">
        <div className="auth-form-heading">
          <span className="auth-form-icon" aria-hidden>{isSignUp ? "✦" : "↗"}</span>
          <div>
            <h2>{isSignUp ? "Comece sua jornada" : "Bem-vindo de volta"}</h2>
            <p>{isSignUp ? "Crie uma conta para levar seus registros com você." : "Acesse seus registros de onde estiver."}</p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="auth-email">E-mail</label>
          <input className="input" id="auth-email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="auth-password">Senha</label>
          <input className="input" id="auth-password" name="password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={isSignUp ? 8 : undefined} required />
          {isSignUp && <span className="field-hint">Use pelo menos 8 caracteres.</span>}
        </div>
        {state.message ? <div className="alert" role="status">{state.message}</div> : null}
        <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>
          {pending ? (isSignUp ? "Criando conta…" : "Entrando…") : (isSignUp ? "Criar minha conta" : "Entrar")}
        </button>
      </form>

      <p className="auth-privacy">Seus registros são privados. O Canetta não diagnostica nem altera seu tratamento.</p>
    </div>
  );
}
