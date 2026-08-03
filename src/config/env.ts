/**
 * Configuração de ambiente para a integração com a API do Claude (Anthropic).
 *
 * As variáveis são lidas de variáveis de ambiente `EXPO_PUBLIC_*`, que o Expo
 * injeta no bundle em tempo de build. Configure-as em um arquivo `.env` na raiz
 * do projeto (veja `.env.example`).
 *
 * IMPORTANTE (segurança): nunca embarque uma chave de API real de produção em um
 * app cliente distribuído — qualquer pessoa pode extraí-la do bundle. Em
 * produção, aponte `EXPO_PUBLIC_ANTHROPIC_BASE_URL` para um backend/proxy seu
 * que guarde a chave no servidor. Veja COOKBOOK.md para detalhes.
 */

export const anthropicConfig = {
  /** Chave de API da Anthropic. Vazia por padrão (usa fallback local). */
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',

  /**
   * URL base da API. Padrão: API oficial da Anthropic. Em produção,
   * substitua pela URL do seu proxy (ex.: https://seu-backend.com/anthropic).
   */
  baseUrl: process.env.EXPO_PUBLIC_ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com',

  /** Modelo usado nas chamadas. Configurável para facilitar upgrades. */
  model: process.env.EXPO_PUBLIC_ANTHROPIC_MODEL ?? 'claude-sonnet-5',

  /** Versão da API Anthropic (header anthropic-version). */
  apiVersion: '2023-06-01',
};

/** Retorna true se há uma chave de API configurada. */
export function isClaudeConfigured(): boolean {
  return anthropicConfig.apiKey.trim().length > 0;
}
