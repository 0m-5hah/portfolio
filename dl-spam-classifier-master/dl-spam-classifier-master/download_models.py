"""
Download model files from GitHub LFS if they are missing or are LFS pointer stubs.
Run once during build: python download_models.py
"""
import os
import sys
import urllib.request

OUTPUTS_DIR = os.path.join(os.path.dirname(__file__), "outputs")

LFS_POINTER_MAGIC = b"version https://git-lfs.github.com/spec/"

FILES = {
    "dl_model.onnx": (
        "https://media.githubusercontent.com/media/0m-5hah/portfolio/main/"
        "dl-spam-classifier-master/dl-spam-classifier-master/outputs/dl_model.onnx"
    ),
    "tokenizer.json": (
        "https://media.githubusercontent.com/media/0m-5hah/portfolio/main/"
        "dl-spam-classifier-master/dl-spam-classifier-master/outputs/tokenizer.json"
    ),
}


def is_lfs_pointer(path: str) -> bool:
    try:
        with open(path, "rb") as f:
            return f.read(50).startswith(LFS_POINTER_MAGIC)
    except OSError:
        return False


def download(url: str, dest: str) -> None:
    print(f"Downloading {os.path.basename(dest)} ...", flush=True)
    urllib.request.urlretrieve(url, dest)
    size_mb = os.path.getsize(dest) / 1_048_576
    print(f"  -> {size_mb:.1f} MB saved to {dest}", flush=True)


def main() -> None:
    os.makedirs(OUTPUTS_DIR, exist_ok=True)
    all_ok = True
    for filename, url in FILES.items():
        dest = os.path.join(OUTPUTS_DIR, filename)
        if os.path.exists(dest) and not is_lfs_pointer(dest):
            print(f"{filename}: already present, skipping.")
            continue
        try:
            download(url, dest)
        except Exception as exc:
            print(f"ERROR downloading {filename}: {exc}", file=sys.stderr)
            all_ok = False
    if not all_ok:
        sys.exit(1)
    print("All model files ready.")


if __name__ == "__main__":
    main()
