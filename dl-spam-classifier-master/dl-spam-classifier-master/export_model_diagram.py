from pathlib import Path

import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras.utils import plot_model


def save_summary_image(model: tf.keras.Model, out_path: Path) -> None:
    lines: list[str] = []
    model.summary(print_fn=lines.append)
    text = "\n".join(lines)

    fig_h = max(6, 0.24 * len(lines))
    fig, ax = plt.subplots(figsize=(12, fig_h))
    ax.axis("off")
    ax.text(0.01, 0.99, text, va="top", ha="left", family="monospace", fontsize=10)
    fig.tight_layout()
    fig.savefig(out_path, dpi=180, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    model_path = base_dir / "outputs" / "dl_model.keras"
    out_png = base_dir / "outputs" / "model_architecture_dl.png"

    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")

    model = tf.keras.models.load_model(model_path)

    try:
        plot_model(
            model,
            to_file=str(out_png),
            show_shapes=True,
            show_dtype=False,
            show_layer_names=True,
            expand_nested=False,
            dpi=180,
        )
        if out_png.exists():
            print(f"Saved architecture diagram: {out_png}")
        else:
            save_summary_image(model, out_png)
            print("Graphviz diagram not produced by plot_model.")
            print(f"Saved model summary image instead: {out_png}")
    except Exception as e:
        save_summary_image(model, out_png)
        print(f"Graphviz diagram unavailable ({e}).")
        print(f"Saved model summary image instead: {out_png}")


if __name__ == "__main__":
    main()
