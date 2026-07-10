"use client";

import { useActionState } from "react";
import { saveProfileAction, type ProfileState } from "./actions";

const initialState: ProfileState = {};

export function ProfileForm() {
  const [state, formAction, pending] = useActionState(saveProfileAction, initialState);

  return (
    <form action={formAction} className="form">
      <div className="field">
        <label htmlFor="name">Nome</label>
        <input className="input" id="name" name="name" placeholder="Como quer ser chamado?" />
      </div>
      <div className="field">
        <label htmlFor="stage">Momento da jornada</label>
        <select className="select" id="stage" name="stage" required defaultValue="">
          <option value="" disabled>
            Escolha uma opção
          </option>
          <option value="usa">Já uso GLP-1</option>
          <option value="quer_comecar">Quero começar / conversar com profissional</option>
        </select>
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="medication">Medicamento registrado</label>
          <input className="input" id="medication" name="medication" placeholder="Ex.: Mounjaro" />
        </div>
        <div className="field">
          <label htmlFor="current_dose">Dose registrada</label>
          <input className="input" id="current_dose" name="current_dose" placeholder="Ex.: 2,5 mg" />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="frequency">Frequência registrada</label>
          <input className="input" id="frequency" name="frequency" placeholder="Ex.: semanal" />
        </div>
        <div className="field">
          <label htmlFor="height_cm">Altura registrada</label>
          <input className="input" id="height_cm" name="height_cm" type="number" inputMode="numeric" placeholder="cm" />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="goal_weight">Meta informada por você</label>
          <input className="input" id="goal_weight" name="goal_weight" type="number" step="0.1" inputMode="decimal" placeholder="kg" />
        </div>
        <div className="field">
          <label htmlFor="biggest_difficulty">Maior dificuldade registrada</label>
          <input className="input" id="biggest_difficulty" name="biggest_difficulty" placeholder="Ex.: fome à noite" />
        </div>
      </div>
      <div className="boundary">
        Isto organiza seus registros. Mudanças de dose, alimentação ou treino devem ser combinadas com seus profissionais.
      </div>
      {state.message ? <div className="alert">{state.message}</div> : null}
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Salvando..." : "Salvar perfil"}
      </button>
    </form>
  );
}
