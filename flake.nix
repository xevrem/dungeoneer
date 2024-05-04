{
  description = "behavey nix env";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
  let
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
    rustPkgs = with pkgs; [
      emacs-lsp-booster
    ];
    nodePkgs = with pkgs.nodePackages; [
      eslint
      pnpm
      prettier
      stylelint
      typescript
      typescript-language-server
      vscode-langservers-extracted
      yaml-language-server
    ];
    in
    {
      devShells.${system}.default =
        pkgs.mkShell {
          # buildInputs = with pkgs; [
          # ];
          
          packages = with pkgs; [
            marksman
            nodejs_20
          ] ++ nodePkgs ++ rustPkgs;

          shellHook = ''
              echo "<nix development shell>"
            '';
        };
    };
}
