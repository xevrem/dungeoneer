import * as esbuild from "esbuild";
import { inlineSass } from "esbuild-inline-sass";

console.log("esbuild - building...");

await esbuild.build({
  bundle: true,
  entryPoints: ["./src/index.jsx"],
  loader: {
    ".jpg": "file",
  },
  logLevel: "silent",
  minify: true,
  outdir: "./public",
  plugins: [inlineSass()],
  sourcemap: false,
  // set to latest LTS builds
  target: ["chrome127", "firefox128"],
  tsconfig: "tsconfig.build.json",
});

console.log("esbuild - build done.");
