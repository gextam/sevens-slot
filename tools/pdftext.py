"""Crude text extraction from a simple PDF (decompresses content streams and
prints the string operands of text operators, in order). usage: python -I tools/pdftext.py file.pdf"""
import re, sys, zlib

data = open(sys.argv[1], 'rb').read()
chunks = []
for m in re.finditer(rb'stream\r?\n(.*?)\r?\nendstream', data, re.S):
    s = m.group(1)
    try:
        t = zlib.decompress(s)
    except Exception:
        t = s
    # text operators: (...) Tj  and  [(...) n (...)] TJ ; collect strings in order
    strings = []
    for tm in re.finditer(rb'\[(.*?)\]\s*TJ|\((.*?)\)\s*Tj|\'|\"', t, re.S):
        if tm.group(1) is not None:
            strings.append(b''.join(re.findall(rb'\((.*?)\)', tm.group(1), re.S)))
        elif tm.group(2) is not None:
            strings.append(tm.group(2))
    # also note positioning to break lines: use Td/TD/T* as newlines
    lines, cur = [], []
    for tok in re.finditer(rb'\[(.*?)\]\s*TJ|\((.*?)\)\s*Tj|(T\*|Td|TD|Tm|ET)', t, re.S):
        if tok.group(3):
            if cur: lines.append(b' '.join(cur)); cur = []
        elif tok.group(1) is not None:
            cur.append(b''.join(re.findall(rb'\((.*?)\)', tok.group(1), re.S)))
        else:
            cur.append(tok.group(2))
    if cur: lines.append(b' '.join(cur))
    if lines:
        chunks.append(b'\n'.join(lines).decode('latin-1'))
print('\n===== stream =====\n'.join(chunks))
