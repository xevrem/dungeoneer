import * as esbuild from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";

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
  plugins: [sassPlugin()],
  sourcemap: false,
  // set to latest LTS builds
  target: ["chrome127", "firefox128"],
  tsconfig: "tsconfig.build.json",
});

console.log("esbuild - build done.");
