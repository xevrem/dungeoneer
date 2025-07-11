import * as esbuild from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";

let ctx = await esbuild.context({
  bundle: true,
  entryPoints: ["./src/index.jsx"],
  loader: {
    ".jpg": "file",
  },
  logLevel: "debug",
  minify: false,
  outdir: "./build",
  plugins: [sassPlugin()],
  sourcemap: true,
  // set to latest LTS builds
  target: ["chrome127", "firefox128"],
  tsconfig: "tsconfig.dev.json",
});

await ctx.watch({});

let { host: _host, port: _port } = await ctx.serve({
  servedir: "./build",
});
