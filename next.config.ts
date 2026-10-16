import type { NextConfig } from "next";

const config: NextConfig = {
  // the render route reads the pre-built Remotion bundle at runtime
  outputFileTracingIncludes: { "/api/projects/*/render": ["./.remotion-bundle/**/*"] },
};

export default config;
