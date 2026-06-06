from __future__ import annotations

from datetime import datetime
from pathlib import Path

from fpdf import FPDF


ROOT = Path(__file__).resolve().parent
OUTPUT_FILE = ROOT / "all_code_with_paths.pdf"

# Directories to skip while collecting source files
EXCLUDED_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".cursor",
    ".vscode",
    "uploads",
    "__pycache__",
}

# File extensions treated as code/config text
ALLOWED_EXTENSIONS = {
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".json",
    ".css",
    ".scss",
    ".html",
    ".md",
    ".py",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".go",
    ".rs",
    ".sh",
    ".yml",
    ".yaml",
    ".toml",
    ".env",
    ".sql",
    ".txt",
}

ALLOWED_FILENAMES = {
    "Dockerfile",
    ".gitignore",
    ".dockerignore",
}


def should_include(path: Path) -> bool:
    if any(part in EXCLUDED_DIRS for part in path.parts):
        return False
    if path.suffix.lower() in ALLOWED_EXTENSIONS:
        return True
    return path.name in ALLOWED_FILENAMES


def collect_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if should_include(rel):
            files.append(path)
    files.sort(key=lambda p: str(p.relative_to(root)).lower())
    return files


def safe_text(text: str) -> str:
    # Core PDF fonts are latin-1; replace unsupported chars.
    return text.encode("latin-1", errors="replace").decode("latin-1")


def add_header(pdf: FPDF, file_path: Path) -> None:
    rel_path = file_path.relative_to(ROOT)
    usable_width = pdf.w - pdf.l_margin - pdf.r_margin
    pdf.add_page()
    pdf.set_font("Courier", "B", 11)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, 6, safe_text(f"File: {file_path.name}"), wrapmode="CHAR")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, 6, safe_text(f"Path: {rel_path.as_posix()}"), wrapmode="CHAR")
    pdf.ln(1)
    pdf.set_font("Courier", "", 9)
    pdf.cell(0, 5, safe_text("-" * 100), new_x="LMARGIN", new_y="NEXT")


def add_file_content(pdf: FPDF, file_path: Path) -> None:
    usable_width = pdf.w - pdf.l_margin - pdf.r_margin
    try:
        text = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = file_path.read_text(encoding="latin-1", errors="replace")
    except Exception as exc:
        text = f"[Error reading file: {exc}]"

    lines = text.splitlines() or [""]
    for i, line in enumerate(lines, start=1):
        numbered_line = f"{i:5d} | {line}"
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(usable_width, 4.5, safe_text(numbered_line), wrapmode="CHAR")


def build_pdf() -> None:
    files = collect_files(ROOT)
    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.set_margins(10, 10, 10)
    usable_width = pdf.w - pdf.l_margin - pdf.r_margin
    pdf.set_title("Project Code Export")
    pdf.set_author("Cursor Agent")
    pdf.set_subject(f"Generated {datetime.now().isoformat(timespec='seconds')}")

    # Title page
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Project Code Export", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, 7, safe_text(f"Root: {ROOT.as_posix()}"), wrapmode="CHAR")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(usable_width, 7, safe_text(f"Files included: {len(files)}"), wrapmode="CHAR")
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(
        usable_width,
        7,
        safe_text(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"),
        wrapmode="CHAR",
    )

    for file_path in files:
        add_header(pdf, file_path)
        add_file_content(pdf, file_path)

    pdf.output(str(OUTPUT_FILE))
    print(f"PDF generated: {OUTPUT_FILE}")
    print(f"Files included: {len(files)}")


if __name__ == "__main__":
    build_pdf()
