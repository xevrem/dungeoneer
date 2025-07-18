{
  description = "dungeoneer nix env";

  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
  };
  
  outputs = {
    self,
    nixpkgs,
    flake-utils,
    ...
  }@inputs:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {
          inherit system;
        };
        nodePkgs = with pkgs.nodePackages; [
          eslint
          prettier
          stylelint
          typescript
          typescript-language-server
          vscode-langservers-extracted
          yaml-language-server
        ];
      in
        {
          devShells.default = pkgs.mkShell {
            packages = with pkgs; [
              jq
              marksman
              nodejs_20
            ] ++ nodePkgs;
          };
        }
    );
}
