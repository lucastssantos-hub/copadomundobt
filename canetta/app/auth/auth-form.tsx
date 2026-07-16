"use client";

import { useActionState } from "react";
import { signInAction, signUpAction, type AuthState } from "./actions";

const initialState: AuthState = {};

export function AuthForm() {
  const [signInState, signInFormAction, signInPending] = useActionState(signInAction, initialState);
  const [signUpState, signUpFormAction, signUpPending] = useActionState(signUpAction, initialState);

  return (
    <div className="form">
      <form action={signInFormAction} className="card">
        <span className="eyebrow">Entrar</span>
        <div className="field">
          <label htmlFor="login-email">E-mail</label>
          <input className="input" id="login-email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="login-password">Senha</label>
          <input className="input" id="login-password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {signInState.message ? <div className="alert">{signInState.message}</div> : null}
        <button className="btn btn-primary" type="submit" disabled={signInPending} style={{ width: "100%", marginTop: 14 }}>
          {signInPending ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <form action={signUpFormAction} className="card soft">
        <span className="eyebrow">Criar conta</span>
        <div className="field">
          <label htmlFor="signup-email">E-mail</label>
          <input className="input" id="signup-email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="signup-password">Senha</label>
          <input className="input" id="signup-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        {signUpState.message ? <div className="alert">{signUpState.message}</div> : null}
        <button className="btn btn-ghost" type="submit" disabled={signUpPending} style={{ width: "100%", marginTop: 14 }}>
          {signUpPending ? "Criando..." : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
