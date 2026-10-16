import next from "eslint-config-next";

const config = [...next, { ignores: [".next/**"] }];
export default config;
