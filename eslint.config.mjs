import next from "eslint-config-next";

const config = [...next, { ignores: [".remotion-bundle/**", ".next/**"] }];
export default config;
