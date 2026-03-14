#!/usr/bin/env python3
"""
Extract CBME 2024 competency tables from PDF and export as per-subject Excel files.

Usage:
    source scripts/.venv/bin/activate
    python scripts/extract-pdf-to-excel.py <pdf-path> [output-dir]

The output Excel files are formatted for the existing import-excel.ts script.
"""

import sys
import os
import re
import pdfplumber
from openpyxl import Workbook


# Subject code mapping from PDF -> our DB codes
# The PDF uses slightly different codes for some subjects
SUBJECT_CODE_MAP = {
    "AN": "AN",
    "PY": "PY",
    "BC": "BI",   # PDF uses BC, DB uses BI for Biochemistry
    "PH": "PH",
    "PA": "PA",
    "MI": "MI",
    "FM": "FM",
    "CM": "CM",
    "GM": "IM",   # PDF uses GM (General Medicine), DB uses IM
    "PE": "PE",
    "PS": "PS",
    "DR": "DR",
    "SU": "SU",
    "OP": "OP",
    "EN": "EN",
    "OG": "OG",
    "OR": "OR",
    "AS": "AS",
    "RD": "RD",
}

SUBJECT_NAMES = {
    "AN": "Anatomy",
    "BI": "Biochemistry",
    "PY": "Physiology",
    "PA": "Pathology",
    "MI": "Microbiology",
    "PH": "Pharmacology",
    "FM": "Forensic Medicine",
    "CM": "Community Medicine",
    "IM": "General Medicine",
    "SU": "General Surgery",
    "OG": "Obstetrics and Gynaecology",
    "PE": "Paediatrics",
    "OR": "Orthopaedics",
    "EN": "Otorhinolaryngology (ENT)",
    "OP": "Ophthalmology",
    "PS": "Psychiatry",
    "DR": "Dermatology, Venereology & Leprosy",
    "RD": "Radiodiagnosis",
    "AS": "Anaesthesiology",
}

# Regex to detect subject title pages
SUBJECT_TITLE_RE = re.compile(
    r'\(CODE:\s*([A-Z]{2})\)', re.IGNORECASE
)

# Regex to detect topic header rows
TOPIC_RE = re.compile(
    r'^Topic\s*(\d+)\s*[:.]?\s*(.+?)(?:\s*Number\s*of\s*[Cc]ompetenc|$)',
    re.IGNORECASE
)

# Regex to detect subject summary rows like "Anatomy\n(Topics = 82, Competencies = 413)"
SUBJECT_SUMMARY_RE = re.compile(
    r'Topics\s*[=:]\s*(\d+).*Competencies\s*[=:]\s*(\d+)',
    re.IGNORECASE
)

# Regex to detect competency codes like AN1.1, GM 1.10, SU4.3
COMPETENCY_CODE_RE = re.compile(
    r'^([A-Z]{2})\s*(\d+\.\d+)$'
)

# Header row detection
HEADER_KEYWORDS = ["Number", "COMPETENCY", "Predominant"]


def is_header_row(row):
    """Check if a row is a table header (not a topic row)."""
    if not row or not row[0]:
        return False
    first = str(row[0]).strip()
    # Header rows start with "Number" as the cell content, not containing it mid-text
    # Avoid matching topic rows that contain "Number of Competencies"
    if first.startswith("Topic"):
        return False
    return first in HEADER_KEYWORDS or first.startswith("Number")


def is_topic_row(row):
    """Check if a row is a topic header (all cells after first are None/empty)."""
    if not row or not row[0]:
        return False
    first = str(row[0]).strip()
    # Topic rows have content only in the first cell, rest are None
    non_null = [c for c in row[1:] if c and str(c).strip()]
    if non_null:
        return False
    return bool(TOPIC_RE.search(first))


def is_subject_summary_row(row):
    """Check if row contains subject summary like 'Anatomy (Topics = 82, ...)'."""
    if not row or not row[0]:
        return False
    first = str(row[0]).strip()
    non_null = [c for c in row[1:] if c and str(c).strip()]
    if non_null:
        return False
    return bool(SUBJECT_SUMMARY_RE.search(first))


def parse_topic_name(text):
    """Extract topic name from a topic header row."""
    match = TOPIC_RE.search(text)
    if match:
        topic_num = match.group(1)
        topic_name = match.group(2).strip().rstrip('-').strip()
        return f"Topic {topic_num}: {topic_name}"
    return text.strip()


def normalize_competency_code(code_str):
    """Normalize competency code: 'GM 1.10' -> 'GM1.10', strip whitespace."""
    if not code_str:
        return None
    code = str(code_str).strip()
    # Remove internal spaces between subject code and number
    code = re.sub(r'^([A-Z]{2})\s+', r'\1', code)
    return code if COMPETENCY_CODE_RE.match(code) else None


def clean_text(text):
    """Clean extracted text: normalize whitespace, fix line breaks."""
    if not text:
        return ""
    t = str(text).strip()
    # Replace newlines with spaces, collapse multiple spaces
    t = re.sub(r'\s+', ' ', t)
    return t


def extract_competencies(pdf_path):
    """
    Extract all competencies from the PDF.
    Returns a dict: {db_subject_code: [(competency_code, topic, text, domain, level, core, teaching, assessment), ...]}
    """
    subjects = {}
    current_pdf_code = None
    current_db_code = None
    current_topic = "General"
    pending_continuation = None  # For rows that span pages
    pending_subject = None  # Track which subject the pending row belongs to

    print(f"Opening PDF: {pdf_path}")

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"Total pages: {total_pages}")

        for page_idx in range(total_pages):
            page = pdf.pages[page_idx]
            text = page.extract_text() or ""

            # Check if this is a subject title page
            title_match = SUBJECT_TITLE_RE.search(text)
            if title_match:
                pdf_code = title_match.group(1).upper()
                if pdf_code in SUBJECT_CODE_MAP:
                    current_pdf_code = pdf_code
                    current_db_code = SUBJECT_CODE_MAP[pdf_code]
                    current_topic = "General"
                    if current_db_code not in subjects:
                        subjects[current_db_code] = []
                    print(f"  Page {page_idx + 1}: Found subject {pdf_code} -> {SUBJECT_NAMES.get(current_db_code, current_db_code)}")

            if not current_pdf_code:
                continue

            # Extract tables from this page
            tables = page.extract_tables()
            if not tables:
                continue

            for table in tables:
                for row in table:
                    if not row:
                        continue

                    # Handle topic headers FIRST (before header check, since
                    # topic rows contain "Number of Competencies" which could
                    # false-match the header check)
                    if is_topic_row(row):
                        if pending_continuation and pending_subject:
                            subjects[pending_subject].append(pending_continuation)
                            pending_continuation = None
                            pending_subject = None
                        current_topic = parse_topic_name(str(row[0]).strip())
                        continue

                    # Skip header rows
                    if is_header_row(row):
                        if pending_continuation and pending_subject:
                            subjects[pending_subject].append(pending_continuation)
                            pending_continuation = None
                            pending_subject = None
                        continue

                    # Skip subject summary rows
                    if is_subject_summary_row(row):
                        continue

                    # Handle empty first-cell rows (continuation of previous competency)
                    first_cell = str(row[0]).strip() if row[0] else ""
                    code = normalize_competency_code(first_cell)

                    if not code and not first_cell:
                        # This is a continuation row - append text to previous competency
                        if pending_continuation and row[1]:
                            extra_text = clean_text(row[1])
                            if extra_text:
                                pending_continuation = (
                                    pending_continuation[0],  # code
                                    pending_continuation[1],  # topic
                                    pending_continuation[2] + " " + extra_text,  # text
                                    pending_continuation[3] or clean_text(row[2]) if len(row) > 2 else pending_continuation[3],
                                    pending_continuation[4] or clean_text(row[3]) if len(row) > 3 else pending_continuation[4],
                                    pending_continuation[5] or clean_text(row[4]) if len(row) > 4 else pending_continuation[5],
                                    pending_continuation[6] or clean_text(row[5]) if len(row) > 5 else pending_continuation[6],
                                    pending_continuation[7] or clean_text(row[6]) if len(row) > 6 else pending_continuation[7],
                                )
                        continue

                    if not code:
                        # Not a competency code, not a topic, not a continuation - skip
                        continue

                    # Verify the code prefix matches current subject
                    code_prefix = re.match(r'^([A-Z]{2})', code)
                    if code_prefix and code_prefix.group(1) != current_pdf_code:
                        # Code belongs to a different subject - update context
                        new_pdf_code = code_prefix.group(1)
                        if new_pdf_code in SUBJECT_CODE_MAP:
                            current_pdf_code = new_pdf_code
                            current_db_code = SUBJECT_CODE_MAP[new_pdf_code]
                            if current_db_code not in subjects:
                                subjects[current_db_code] = []

                    # This is a new competency row - save pending one first
                    # Use pending_subject (not current_db_code) to handle
                    # subject boundary crossings correctly
                    if pending_continuation and pending_subject:
                        subjects[pending_subject].append(pending_continuation)

                    # Map the code to DB format (replace PDF prefix with DB prefix)
                    db_code = current_db_code + code[2:]  # Replace first 2 chars with DB code

                    comp_text = clean_text(row[1]) if len(row) > 1 else ""
                    domain = clean_text(row[2]) if len(row) > 2 else ""
                    level = clean_text(row[3]) if len(row) > 3 else ""
                    core = clean_text(row[4]) if len(row) > 4 else ""
                    teaching = clean_text(row[5]) if len(row) > 5 else ""
                    assessment = clean_text(row[6]) if len(row) > 6 else ""

                    pending_continuation = (
                        db_code, current_topic, comp_text,
                        domain, level, core, teaching, assessment
                    )
                    pending_subject = current_db_code

        # Don't forget the last pending row
        if pending_continuation and pending_subject:
            subjects[pending_subject].append(pending_continuation)

    return subjects


def write_excel_files(subjects, output_dir):
    """Write per-subject Excel files compatible with the import service."""
    os.makedirs(output_dir, exist_ok=True)

    # Column headers matching what importService expects
    headers = [
        "Number",
        "Competency",
        "Topic",
        "Domain",
        "Level",
        "Core",
        "Teaching Methods",
        "Assessment Methods",
    ]

    total_competencies = 0

    for db_code, competencies in sorted(subjects.items()):
        subject_name = SUBJECT_NAMES.get(db_code, db_code)
        filename = f"{subject_name}.xlsx"
        filepath = os.path.join(output_dir, filename)

        wb = Workbook()
        ws = wb.active
        ws.title = "Competencies"

        # Write header row
        ws.append(headers)

        # Write competency rows
        for comp in competencies:
            code, topic, text, domain, level, core, teaching, assessment = comp
            if not text:  # Skip empty competency text
                continue
            ws.append([code, text, topic, domain, level, core, teaching, assessment])

        wb.save(filepath)
        count = len(competencies)
        total_competencies += count
        print(f"  {filename}: {count} competencies")

    return total_competencies


def main():
    if len(sys.argv) < 2:
        print("Usage: python extract-pdf-to-excel.py <pdf-path> [output-dir]")
        print()
        print("Example:")
        print('  python scripts/extract-pdf-to-excel.py "/path/to/cbme2024.pdf" scripts/cbme-2024-excel')
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "cbme-2024-excel"
    )

    if not os.path.exists(pdf_path):
        print(f"Error: PDF not found: {pdf_path}")
        sys.exit(1)

    print("=" * 60)
    print("CBME 2024 PDF -> Excel Extraction")
    print("=" * 60)
    print()

    # Step 1: Extract competencies from PDF
    print("Step 1: Extracting competencies from PDF...")
    subjects = extract_competencies(pdf_path)
    print()

    # Step 2: Write Excel files
    print(f"Step 2: Writing Excel files to {output_dir}...")
    total = write_excel_files(subjects, output_dir)
    print()

    # Summary
    print("=" * 60)
    print("EXTRACTION SUMMARY")
    print("=" * 60)
    print(f"  Subjects found: {len(subjects)}")
    print(f"  Total competencies: {total}")
    print(f"  Output directory: {output_dir}")
    print()
    for db_code in sorted(subjects.keys()):
        name = SUBJECT_NAMES.get(db_code, db_code)
        count = len(subjects[db_code])
        print(f"  {db_code:4s} {name:40s} {count:5d}")
    print("=" * 60)


if __name__ == "__main__":
    main()
