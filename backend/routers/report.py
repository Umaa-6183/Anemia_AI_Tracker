"""
routers/report.py

Endpoints:
  POST /api/report  — generate and return a hospital-grade PDF report as a binary blob
"""

from __future__ import annotations

import base64
import io
import json
import os
import tempfile
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from loguru import logger
from pydantic import BaseModel, Field
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, PageBreak,
    PageTemplate, Paragraph, Spacer, Table,
    TableStyle,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

router = APIRouter()

# ── Page geometry ──────────────────────────────────────
PAGE_W, PAGE_H = A4           # 210 × 297 mm
MARGIN = 14 * mm


# ═══════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════

class PatientInfo(BaseModel):
    name:             str
    age:              int
    sex:              str
    pregnancy_status: bool = False


class ScanInfo(BaseModel):
    hb:                 float
    severity:           str
    severity_label:     str
    confidence:         Optional[float] = None
    gradcam_image:      Optional[str] = None
    processing_time_ms: Optional[int] = None
    timestamp:          Optional[str] = None
    is_mock:            bool = False


class LabEntry(BaseModel):
    date:      str
    rbc:       Optional[float] = None
    wbc:       Optional[float] = None
    ferritin:  Optional[float] = None
    platelets: Optional[float] = None
    lab_name:  Optional[str] = None
    notes:     Optional[str] = None


class ReportRequest(BaseModel):
    patient:   PatientInfo
    scan:      ScanInfo
    symptoms:  list[str] = Field(default_factory=list)
    lab_logs:  list[LabEntry] = Field(default_factory=list)
    remedies:  Optional[dict] = None


# ═══════════════════════════════════════════════════════
# COLOUR PALETTE
# ═══════════════════════════════════════════════════════

NAVY = colors.HexColor("#082849")
BLUE = colors.HexColor("#0e8ee7")
WHITE = colors.white
LGRAY = colors.HexColor("#f1f5f9")
MGRAY = colors.HexColor("#94a3b8")
DGRAY = colors.HexColor("#334155")
GREEN = colors.HexColor("#22c55e")
YELLOW = colors.HexColor("#facc15")
ORANGE = colors.HexColor("#f97316")
RED = colors.HexColor("#ef4444")

SEVERITY_COLORS = {
    "normal":   GREEN,
    "mild":     YELLOW,
    "moderate": ORANGE,
    "severe":   RED,
}

# ── Paragraph styles ───────────────────────────────────
STYLES = getSampleStyleSheet()


def _style(name, **kwargs):
    return ParagraphStyle(name, **kwargs)


TITLE_STYLE = _style("Title",    fontSize=18, textColor=WHITE,
                     fontName="Helvetica-Bold",  leading=22, spaceAfter=2)
HEADING_STYLE = _style("Heading",  fontSize=10, textColor=WHITE,
                       fontName="Helvetica-Bold",  leading=13)
BODY_STYLE = _style("Body",     fontSize=8,  textColor=DGRAY,
                    fontName="Helvetica",       leading=11, spaceAfter=3)
BODY_B_STYLE = _style("BodyBold", fontSize=8,  textColor=DGRAY,
                      fontName="Helvetica-Bold",  leading=11)
SMALL_STYLE = _style("Small",    fontSize=7,  textColor=MGRAY,
                     fontName="Helvetica",       leading=9)
FOOTER_STYLE = _style("Footer",   fontSize=6,  textColor=MGRAY,
                      fontName="Helvetica-Oblique", leading=8)
DISC_STYLE = _style("Disc",     fontSize=6,  textColor=colors.HexColor(
    "#64748b"), fontName="Helvetica-Oblique", leading=8, spaceBefore=2)


# ═══════════════════════════════════════════════════════
# PAGE TEMPLATE — header + footer on every page
# ═══════════════════════════════════════════════════════

def _build_page_template(canvas, doc):
    """Called for every page — draws persistent header and footer."""
    canvas.saveState()

    # ── Header bar ────────────────────────────────────
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 20*mm, PAGE_W, 20*mm, fill=1, stroke=0)

    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 13)
    canvas.drawString(MARGIN, PAGE_H - 13*mm, "ANEMIA TRACKER")

    canvas.setFont("Helvetica", 7)
    canvas.drawString(MARGIN, PAGE_H - 17*mm,
                      "AI-Assisted Haemoglobin Screening Report  |  Adjunct screening tool — not a diagnostic replacement")

    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 13*mm, f"Page {doc.page}")
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 17*mm,
                           datetime.now().strftime("%d %b %Y  %H:%M"))

    # ── Footer bar ────────────────────────────────────
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, PAGE_W, 14*mm, fill=1, stroke=0)

    canvas.setFillColor(MGRAY)
    canvas.setFont("Helvetica-Oblique", 5.5)
    disclaimer = (
        "This report utilises AI-estimated Haemoglobin based on conjunctival imaging. "
        "It is an adjunctive screening tool and does not replace phlebotomy or professional medical diagnosis. "
        "Always consult a qualified healthcare professional."
    )
    canvas.drawCentredString(PAGE_W / 2, 8*mm, disclaimer[:120])
    canvas.drawCentredString(PAGE_W / 2, 5*mm, disclaimer[120:])

    canvas.restoreState()


# ═══════════════════════════════════════════════════════
# SECTION HEADER HELPER
# ═══════════════════════════════════════════════════════

def _section_table(title: str) -> Table:
    t = Table([[Paragraph(title, HEADING_STYLE)]],
              colWidths=[PAGE_W - 2*MARGIN])
    t.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, -1), NAVY),
        ("TOPPADDING",  (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


# ═══════════════════════════════════════════════════════
# PDF BUILD FUNCTION
# ═══════════════════════════════════════════════════════

def _build_pdf(req: ReportRequest) -> bytes:
    buf = io.BytesIO()

    # ── Document setup ────────────────────────────────
    doc = BaseDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=22*mm,
        bottomMargin=16*mm,
    )

    frame = Frame(
        MARGIN, 16*mm,
        PAGE_W - 2*MARGIN, PAGE_H - 38*mm,
        id="main",
    )
    template = PageTemplate(
        id="main", frames=[frame], onPage=_build_page_template)
    doc.addPageTemplates([template])

    story = []
    p = req.patient
    s = req.scan
    sev_color = SEVERITY_COLORS.get(s.severity, MGRAY)

    # ── 1. Patient identity block ─────────────────────
    scan_time = s.timestamp[:19].replace(
        "T", "  ") if s.timestamp else datetime.now().strftime("%Y-%m-%d  %H:%M")
    patient_data = [
        ["Patient",  p.name,               "Scan Date/Time", scan_time],
        ["Age",      f"{p.age} years",
            "Sex",            p.sex.capitalize()],
        ["Pregnant", "Yes" if p.pregnancy_status else "No / N/A",
         "Normal Range",
         "≥11.0" if p.pregnancy_status else ("≥13.0" if p.sex == "male" else "≥12.0") + " g/dL"],
    ]
    pt_table = Table(patient_data, colWidths=[30*mm, 65*mm, 38*mm, 52*mm])
    pt_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (0, -1), LGRAY),
        ("BACKGROUND",   (2, 0), (2, -1), LGRAY),
        ("FONTNAME",     (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE",     (0, 0), (-1, -1), 8),
        ("FONTNAME",     (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME",     (2, 0), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR",    (0, 0), (0, -1), DGRAY),
        ("TEXTCOLOR",    (2, 0), (2, -1), DGRAY),
        ("GRID",         (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
        ("TOPPADDING",   (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
    ]))
    story.append(pt_table)
    story.append(Spacer(1, 5*mm))

    # ── 2. AI Diagnostic section ──────────────────────
    story.append(_section_table("1.  AI DIAGNOSTIC — HAEMOGLOBIN ESTIMATE"))
    story.append(Spacer(1, 3*mm))

    conf_str = f"{round(s.confidence*100)}%" if s.confidence else "—"
    proc_str = f"{s.processing_time_ms} ms" if s.processing_time_ms else "—"
    mock_note = "  ⚠ MOCK — train model for real inference" if s.is_mock else ""

    hb_data = [
        [
            Paragraph(
                f"<font size=26><b>{s.hb:.1f}</b></font><br/><font size=8 color='#94a3b8'>g/dL  Estimated Hb</font>", BODY_STYLE),
            Paragraph(
                f"<font size=13><b>{s.severity_label}</b></font><br/><font size=7>WHO Severity Classification</font>", BODY_STYLE),
            Paragraph(
                f"<b>Confidence:</b> {conf_str}<br/><b>Inference:</b> {proc_str}<br/><b>XAI Method:</b> Grad-CAM<br/><font size=7 color='#ef4444'>{mock_note}</font>", BODY_STYLE),
        ]
    ]
    hb_table = Table(hb_data, colWidths=[55*mm, 63*mm, 67*mm])
    hb_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (0, 0), NAVY),
        ("BACKGROUND",   (1, 0), (1, 0), sev_color),
        ("BACKGROUND",   (2, 0), (2, 0), LGRAY),
        ("TEXTCOLOR",    (0, 0), (0, 0), WHITE),
        ("TEXTCOLOR",    (1, 0), (1, 0), WHITE),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",   (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("GRID",         (0, 0), (-1, -1), 0.2, WHITE),
    ]))
    story.append(hb_table)
    story.append(Spacer(1, 4*mm))

    # ── Grad-CAM image ────────────────────────────────
    if s.gradcam_image:
        try:
            if "," in s.gradcam_image:
                _, enc = s.gradcam_image.split(",", 1)
            else:
                enc = s.gradcam_image
            img_bytes = base64.b64decode(enc)

            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                tmp.write(img_bytes)
                tmp_path = tmp.name

            img = Image(tmp_path, width=80*mm,
                        height=54*mm, kind="proportional")

            cam_legend = [
                [img,
                 Paragraph(
                     "<b>Grad-CAM Heatmap</b><br/><br/>"
                     "<font color='#ef4444'>■</font> Red/Yellow — High model activation (strongest Hb signal)<br/>"
                     "<font color='#22c55e'>■</font> Green — Moderate activation<br/>"
                     "<font color='#0e8ee7'>■</font> Blue — Low activation (minimal influence)<br/><br/>"
                     "<i>Gradient-weighted Class Activation Mapping back-propagates "
                     "the output gradient to the final conv layer, highlighting the "
                     "conjunctival pixels that most influenced the Hb estimate.</i>",
                     BODY_STYLE,
                 )
                 ]
            ]
            cam_table = Table(cam_legend, colWidths=[85*mm, 100*mm])
            cam_table.setStyle(TableStyle([
                ("VALIGN",      (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING",  (0, 0), (-1, -1), 4),
            ]))
            story.append(cam_table)
            os.unlink(tmp_path)
        except Exception as exc:
            logger.warning(f"Grad-CAM image embed failed: {exc}")
            story.append(
                Paragraph("[Grad-CAM image unavailable]", SMALL_STYLE))

    story.append(Spacer(1, 5*mm))

    # ── 3. Symptoms section ───────────────────────────
    story.append(_section_table("2.  SELF-REPORTED SYMPTOMS"))
    story.append(Spacer(1, 3*mm))

    SYMPTOM_LABELS = {
        "fatigue":            "Persistent Fatigue",
        "weakness":           "Generalised Weakness",
        "exercise_intolerance": "Exercise Intolerance",
        "dizziness":          "Dizziness / Light-headedness",
        "headache":           "Frequent Headaches",
        "concentration":      "Difficulty Concentrating",
        "shortness_of_breath": "Shortness of Breath",
        "palpitations":       "Heart Palpitations",
        "chest_pain":         "Chest Pain or Tightness",
        "pale_skin":          "Pale Skin or Complexion",
        "pale_conjunctiva":   "Pale Conjunctiva",
        "brittle_nails":      "Brittle or Spoon-Shaped Nails",
        "cold_hands_feet":    "Cold Hands & Feet",
        "cold_intolerance":   "General Cold Intolerance",
        "restless_legs":      "Restless Leg Syndrome",
        "poor_sleep":         "Poor Sleep Quality",
    }

    if req.symptoms:
        sym_labels = [SYMPTOM_LABELS.get(s, s.replace(
            "_", " ").title()) for s in req.symptoms]
        cols = 2
        rows = [sym_labels[i:i+cols] for i in range(0, len(sym_labels), cols)]
        if rows and len(rows[-1]) < cols:
            rows[-1] += [""] * (cols - len(rows[-1]))

        sym_table = Table(
            [[Paragraph(f"✓  {cell}", BODY_STYLE)
              for cell in row] for row in rows],
            colWidths=[(PAGE_W - 2*MARGIN) / cols] * cols,
        )
        sym_table.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, -1), LGRAY),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, LGRAY]),
            ("TOPPADDING",   (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",  (0, 0), (-1, -1), 6),
            ("GRID",         (0, 0), (-1, -1), 0.2, colors.HexColor("#e2e8f0")),
        ]))
        story.append(sym_table)
    else:
        story.append(
            Paragraph("No symptoms reported by patient.", SMALL_STYLE))

    story.append(Spacer(1, 5*mm))

    # ── 4. Lab history table ──────────────────────────
    story.append(_section_table("3.  CLINICAL LAB HISTORY"))
    story.append(Spacer(1, 3*mm))

    if req.lab_logs:
        lab_header = ["Date", "RBC (×10¹²/L)", "WBC (×10⁹/L)",
                      "Ferritin (ng/mL)", "Platelets (×10⁹/L)", "Lab / Notes"]
        lab_rows = [lab_header]
        for entry in req.lab_logs:
            lab_rows.append([
                entry.date,
                str(entry.rbc) if entry.rbc is not None else "—",
                str(entry.wbc) if entry.wbc is not None else "—",
                str(entry.ferritin) if entry.ferritin is not None else "—",
                str(entry.platelets)if entry.platelets is not None else "—",
                f"{entry.lab_name or ''} {('· ' + entry.notes) if entry.notes else ''}".strip(
                ) or "—",
            ])

        col_w = [(PAGE_W - 2*MARGIN) / 6] * 6
        lab_table = Table(lab_rows, colWidths=col_w, repeatRows=1)
        lab_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0),  NAVY),
            ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
            ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 7),
            ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LGRAY]),
            ("GRID",          (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ]))
        story.append(lab_table)
    else:
        story.append(
            Paragraph("No laboratory results have been entered.", SMALL_STYLE))

    story.append(Spacer(1, 5*mm))

    # ── 5. Action plan ────────────────────────────────
    story.append(_section_table(
        "4.  ACTION PLAN — DIETARY & LIFESTYLE REMEDIES"))
    story.append(Spacer(1, 3*mm))

    if req.remedies:
        rem = req.remedies
        label = rem.get("label", s.severity_label)
        desc = rem.get("description", "")
        story.append(Paragraph(f"<b>{label}</b> — {desc}", BODY_B_STYLE))
        story.append(Spacer(1, 2*mm))

        for section_key, section_title in [("dietary", "Dietary Recommendations"), ("lifestyle", "Lifestyle Recommendations")]:
            tips = rem.get(section_key, [])
            if not tips:
                continue
            story.append(Paragraph(f"<b>{section_title}</b>", BODY_B_STYLE))
            for tip in tips:
                story.append(Paragraph(
                    f"{tip.get('icon', '')}  <b>{tip.get('title', '')}</b>",
                    BODY_B_STYLE,
                ))
                story.append(Paragraph(tip.get("detail", ""), BODY_STYLE))
                story.append(Spacer(1, 1.5*mm))
    else:
        story.append(Paragraph(
            f"Severity: <b>{s.severity_label}</b>. "
            "Please refer to the Remedies section in the Anemia Tracker app for full dietary and lifestyle recommendations.",
            BODY_STYLE,
        ))

    story.append(Spacer(1, 6*mm))

    # ── Disclaimer repeat ─────────────────────────────
    story.append(Table(
        [[Paragraph(
            "⚠  CLINICAL DISCLAIMER: This report utilises AI-estimated Haemoglobin based on conjunctival imaging. "
            "It is an adjunctive screening tool and does not replace phlebotomy or professional medical diagnosis. "
            "Always consult a qualified healthcare professional for clinical decisions.",
            DISC_STYLE,
        )]],
        colWidths=[PAGE_W - 2*MARGIN],
    ))

    doc.build(story)
    return buf.getvalue()


# ═══════════════════════════════════════════════════════
# POST /api/report
# ═══════════════════════════════════════════════════════

@router.post(
    "/report",
    summary="Generate clinical PDF report",
    response_class=StreamingResponse,
)
async def generate_report(payload: ReportRequest):
    """
    Accepts the full scan + patient + lab + symptom data and
    returns a hospital-grade PDF as a binary download.
    """
    try:
        pdf_bytes = _build_pdf(payload)
        logger.info(
            f"PDF generated | patient={payload.patient.name} "
            f"hb={payload.scan.hb} size={len(pdf_bytes)//1024}KB"
        )
    except Exception as exc:
        logger.error(f"PDF generation failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF generation failed: {str(exc)}",
        )

    name = payload.patient.name.replace(" ", "_")
    date = (payload.scan.timestamp or datetime.now().isoformat())[:10]
    filename = f"Anemia_Report_{name}_{date}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length":      str(len(pdf_bytes)),
        },
    )
