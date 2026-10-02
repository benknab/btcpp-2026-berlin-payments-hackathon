# Install Bark

Install **Bark and Barkd 0.7.1**. These commands use Second's official releases for macOS and Linux x86-64:

```sh
(
  set -eu
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64) platform=apple-aarch64 ;;
    Darwin-x86_64) platform=apple-x86_64 ;;
    Linux-x86_64) platform=linux-x86_64 ;;
    *) echo "See Second's install guides for this platform." >&2; exit 1 ;;
  esac

  mkdir -p "$HOME/.local/bin"
  for tool in bark barkd; do
    if [ -e "$HOME/.local/bin/$tool" ] || [ -L "$HOME/.local/bin/$tool" ]; then
      echo "Already installed: $HOME/.local/bin/$tool; check its version before replacing it." >&2
      exit 1
    fi
  done

  download_dir=$(mktemp -d "${TMPDIR:-/tmp}/bark-install.XXXXXX")
  for tool in bark barkd; do
    curl --fail --location --proto '=https' --tlsv1.2 \
      "https://gitlab.com/ark-bitcoin/bark/-/releases/bark-0.7.1/downloads/$tool-0.7.1-$platform" \
      --output "$download_dir/$tool"
    install -m 755 "$download_dir/$tool" "$HOME/.local/bin/$tool"
  done
)

export PATH="$HOME/.local/bin:$PATH"
bark --version
barkd --version
```

Both version commands should report **0.7.1**. Add the PATH export to your shell configuration if needed.
For other platforms or source builds, see Second's [Bark CLI](https://second.tech/docs/getting-started/bark-cli)
and [Barkd](https://second.tech/docs/barkd/install) installation guides.

Follow [the local setup](../../README.md#run-locally) and [event settlement guide](BROWSER.md).
The app uses Second's [mainnet connection details](https://second.tech/docs/connection-details).
Keep wallet directories, recovery phrases, and daemon tokens outside the repository. Never reuse public test seeds.
