import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: appDir,
  // App oficial = uma superfície só: /onboarding/flow -> /journey.
  // As rotas abaixo eram fundações/validações antigas; redirecionam para não
  // competirem como um segundo app. 307 (não permanente) para não travar cache
  // do navegador enquanto o app ainda está em construção.
  async redirects() {
    return [
      { source: "/", destination: "/onboarding/flow", permanent: false },
      { source: "/onboarding", destination: "/onboarding/flow", permanent: false },
      { source: "/validation/onboarding", destination: "/onboarding/flow", permanent: false },
      { source: "/dashboard", destination: "/journey", permanent: false }
    ];
  }
};

export default nextConfig;
