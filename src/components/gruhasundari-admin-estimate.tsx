/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const generatePDF = async (
  windows: WindowEntry[],
  allCalcs: WindowCalc[],
  grandTotal: number,
  stitchingCost: number,
) => {
  const pdf = new jsPDF("p", "mm", "a4");

  /* ─────────────────────────────────────────────
     THEME
  ───────────────────────────────────────────── */
  const BRAND_DARK = "#1C1C2E";
  const BRAND_GOLD = "#C9A96E";
  const BRAND_LIGHT = "#F8F6F1";
  const ACCENT_GRAY = "#6B7280";
  const ROW_ALT = "#FAFAF7";
  const BORDER_COLOR = "#E5E0D8";

  const sharedStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
  `;

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const quoteNumber = `QT-${Date.now().toString().slice(-6)}`;

  /* ─────────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────────── */
  const makeContainer = (innerHTML: string): HTMLDivElement => {
    const el = document.createElement("div");
    el.style.cssText = `
      width:794px; min-height:1123px; background:#fff;
      font-family:'DM Sans',Arial,sans-serif;
      color:${BRAND_DARK}; position:relative;
    `;
    el.innerHTML = `<style>${sharedStyles}</style>${innerHTML}`;
    document.body.appendChild(el);
    return el;
  };

  /* ─────────────────────────────────────────────
     HEADER
  ───────────────────────────────────────────── */
  const headerHTML = (subtitle: string, pageLabel: string) => `
    <div style="background:${BRAND_DARK};padding:32px 48px 24px;position:relative;overflow:hidden;">
      <div style="position:absolute;right:-60px;top:-60px;width:240px;height:240px;border-radius:50%;border:40px solid rgba(201,169,110,0.12);"></div>
      <div style="position:absolute;right:20px;top:-20px;width:120px;height:120px;border-radius:50%;border:2px solid rgba(201,169,110,0.25);"></div>
      <div style="position:relative;z-index:1;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
          <div>
            <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:700;color:#fff;letter-spacing:1px;line-height:1;">ANANDS GRUHASUNDARI</div>
            <div style="font-size:11px;color:${BRAND_GOLD};letter-spacing:3px;margin-top:6px;text-transform:uppercase;">Curtains · Blinds · Furnishings</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:4px;">Vizianagaram, Andhra Pradesh</div>
          </div>
          <div style="text-align:right;">
            <div style="background:${BRAND_GOLD};color:${BRAND_DARK};font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding:4px 12px;border-radius:2px;display:inline-block;margin-bottom:8px;">${pageLabel}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);">${subtitle}</div>
          </div>
        </div>
        <div style="height:1px;background:linear-gradient(90deg,${BRAND_GOLD},transparent);"></div>
        <div style="display:flex;gap:32px;margin-top:14px;">
          <div>
            <div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px;">Quote No.</div>
            <div style="font-size:13px;font-weight:500;color:${BRAND_GOLD};">${quoteNumber}</div>
          </div>
          <div>
            <div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px;">Date</div>
            <div style="font-size:13px;font-weight:500;color:#fff;">${today}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  /* ─────────────────────────────────────────────
     SUMMARY TABLE BUILDER
     desc      — bold row label
     breakdown — sub-text: "107.5 m · 5 windows"
     rateInfo  — right-aligned: "₹213 / m (avg)"
     amount    — the totalled cost
  ───────────────────────────────────────────── */
  interface SummaryRow {
    desc: string;
    breakdown: string;
    rateInfo: string;
    amount: number;
  }

  const buildSummaryTable = (
    title: string,
    rows: SummaryRow[],
    icon: string,
  ) => {
    if (!rows.length) return "";
    const total = rows.reduce((s, r) => s + r.amount, 0);

    const htmlRows = rows
      .map(
        (r, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : ROW_ALT};">
        <td style="padding:12px 14px;border-bottom:1px solid ${BORDER_COLOR};font-size:11px;color:${ACCENT_GRAY};width:28px;">${i + 1}</td>
        <td style="padding:12px 14px;border-bottom:1px solid ${BORDER_COLOR};">
          <div style="font-size:12px;font-weight:600;color:${BRAND_DARK};">${r.desc}</div>
          <div style="font-size:10px;color:${ACCENT_GRAY};margin-top:2px;">${r.breakdown}</div>
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid ${BORDER_COLOR};font-size:11px;color:${ACCENT_GRAY};text-align:right;vertical-align:middle;white-space:nowrap;">${r.rateInfo}</td>
        <td style="padding:12px 14px;border-bottom:1px solid ${BORDER_COLOR};font-size:13px;font-weight:700;text-align:right;vertical-align:middle;color:${BRAND_DARK};">₹${fmtINR(r.amount)}</td>
      </tr>
    `,
      )
      .join("");

    return `
      <div style="margin:28px 48px 0;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <div style="width:28px;height:28px;border-radius:6px;background:${BRAND_DARK};color:${BRAND_GOLD};font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${icon}</div>
          <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:600;color:${BRAND_DARK};">${title}</div>
          <div style="flex:1;height:1px;background:${BORDER_COLOR};margin-left:8px;"></div>
        </div>
        <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);">
          <thead>
            <tr style="background:${BRAND_DARK};">
              <th style="padding:10px 14px;font-size:10px;text-align:left;color:rgba(255,255,255,0.5);letter-spacing:1.5px;text-transform:uppercase;font-weight:500;width:28px;">#</th>
              <th style="padding:10px 14px;font-size:10px;text-align:left;color:rgba(255,255,255,0.5);letter-spacing:1.5px;text-transform:uppercase;font-weight:500;">Description</th>
              <th style="padding:10px 14px;font-size:10px;text-align:right;color:rgba(255,255,255,0.5);letter-spacing:1.5px;text-transform:uppercase;font-weight:500;">Rate / Breakdown</th>
              <th style="padding:10px 14px;font-size:10px;text-align:right;color:${BRAND_GOLD};letter-spacing:1.5px;text-transform:uppercase;font-weight:500;">Total Amount</th>
            </tr>
          </thead>
          <tbody>${htmlRows}</tbody>
          <tfoot>
            <tr style="background:${BRAND_LIGHT};">
              <td colspan="3" style="padding:11px 14px;font-size:12px;font-weight:600;color:${BRAND_DARK};text-align:right;letter-spacing:0.5px;">Section Total</td>
              <td style="padding:11px 14px;font-size:14px;font-weight:700;color:${BRAND_DARK};text-align:right;">₹${fmtINR(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  };

  /* ─────────────────────────────────────────────
     FOOTER
  ───────────────────────────────────────────── */
  const footerHTML = (pageNum: number, totalPages: number) => `
    <div style="position:absolute;bottom:0;left:0;right:0;padding:16px 48px;border-top:1px solid ${BORDER_COLOR};display:flex;justify-content:space-between;align-items:center;background:#fff;">
      <div style="font-size:10px;color:${ACCENT_GRAY};">
        <span style="color:${BRAND_GOLD};font-weight:600;">ANANDS GRUHASUNDARI</span> &nbsp;·&nbsp; ${quoteNumber}
      </div>
      <div style="font-size:10px;color:${ACCENT_GRAY};">Page ${pageNum} of ${totalPages}</div>
    </div>
  `;

  /* ─────────────────────────────────────────────
     AGGREGATE CALCULATIONS
  ───────────────────────────────────────────── */

  // Curtains
  let totalClothMeters = 0,
    totalClothCost = 0,
    clothWindowCount = 0;
  let totalPanels = 0,
    totalStitchCost = 0;
  const trackGroups: Record<
    string,
    { ft: number; cost: number; rate: number }
  > = {};

  // Blinds
  const blindGroups: Record<
    string,
    { sqFt: number; cost: number; rate: number; count: number }
  > = {};
  let totalFixingCost = 0,
    totalBlindWindows = 0;

  windows.forEach((w, i) => {
    const c = allCalcs[i];

    if (w.cat === "curtains" && c.selCurtain) {
      clothWindowCount++;
      totalClothMeters += c.totalClothMeters;
      totalClothCost += c.curtainClothCost;
      totalPanels += c.curtainCount;
      totalStitchCost += c.curtainStitch;

      if (c.selTrack) {
        const key = c.selTrack.label ?? "Standard";
        if (!trackGroups[key])
          trackGroups[key] = { ft: 0, cost: 0, rate: c.selTrack.pricePerFt };
        trackGroups[key].ft += c.wFt;
        trackGroups[key].cost += c.trackLineCost;
      }
    }

    if (w.cat === "blinds" && c.selBlind) {
      totalBlindWindows++;
      totalFixingCost += c.blindFixing;
      const key = c.selBlind.name;
      if (!blindGroups[key])
        blindGroups[key] = {
          sqFt: 0,
          cost: 0,
          rate: c.selBlind.ratePerSqFt,
          count: 0,
        };
      blindGroups[key].sqFt += c.sqFtRounded;
      blindGroups[key].cost += c.blindBase;
      blindGroups[key].count++;
    }
  });

  // Build curtain summary rows
  const curtainSummaryRows: SummaryRow[] = [];

  if (clothWindowCount > 0) {
    const avgClothRate = Math.round(totalClothCost / totalClothMeters);
    curtainSummaryRows.push({
      desc: "Total Cloth / Fabric",
      breakdown: `${totalClothMeters.toFixed(2)} m  ·  ${clothWindowCount} window${clothWindowCount !== 1 ? "s" : ""}`,
      rateInfo: `Avg ₹${avgClothRate} / m`,
      amount: totalClothCost,
    });
    curtainSummaryRows.push({
      desc: "Total Stitching",
      breakdown: `${totalPanels} panel${totalPanels !== 1 ? "s" : ""}  ·  ${clothWindowCount} window${clothWindowCount !== 1 ? "s" : ""}`,
      rateInfo: `₹${stitchingCost} / panel`,
      amount: totalStitchCost,
    });
    Object.entries(trackGroups).forEach(([name, g]) => {
      curtainSummaryRows.push({
        desc: `Track — ${name}`,
        breakdown: `${g.ft.toFixed(2)} ft total`,
        rateInfo: `₹${g.rate} / ft`,
        amount: g.cost,
      });
    });
  }

  // Build blinds summary rows
  const blindSummaryRows: SummaryRow[] = [];

  Object.entries(blindGroups).forEach(([name, g]) => {
    blindSummaryRows.push({
      desc: `${name} Blinds`,
      breakdown: `${g.sqFt} sq.ft  ·  ${g.count} window${g.count !== 1 ? "s" : ""}`,
      rateInfo: `₹${g.rate} / sq.ft`,
      amount: g.cost,
    });
  });

  if (totalBlindWindows > 0) {
    blindSummaryRows.push({
      desc: "Installation / Fixing",
      breakdown: `${totalBlindWindows} unit${totalBlindWindows !== 1 ? "s" : ""}`,
      rateInfo: `₹${BLIND_FIXING_PER_UNIT} / unit`,
      amount: totalFixingCost,
    });
  }

  // Totals for the grand total card
  const curtainTotal =
    totalClothCost +
    totalStitchCost +
    Object.values(trackGroups).reduce((s, g) => s + g.cost, 0);
  const blindTotal =
    Object.values(blindGroups).reduce((s, g) => s + g.cost, 0) +
    totalFixingCost;

  // Stat cards
  const statCards = [
    {
      label: "Total Windows",
      value: String(windows.length),
      sub: "in this quotation",
    },
    ...(clothWindowCount > 0
      ? [
          {
            label: "Cloth Cost",
            value: `₹${fmtINR(totalClothCost)}`,
            sub: `${totalClothMeters.toFixed(1)} m · ${clothWindowCount} windows`,
          },
          {
            label: "Stitching Cost",
            value: `₹${fmtINR(totalStitchCost)}`,
            sub: `${totalPanels} panels`,
          },
          ...Object.entries(trackGroups).map(([name, g]) => ({
            label: `${name} Track`,
            value: `₹${fmtINR(g.cost)}`,
            sub: `${g.ft.toFixed(1)} ft`,
          })),
        ]
      : []),
    ...(totalBlindWindows > 0
      ? [
          {
            label: "Blinds Fabric",
            value: `₹${fmtINR(blindTotal - totalFixingCost)}`,
            sub: `${Object.values(blindGroups).reduce((s, g) => s + g.sqFt, 0)} sq.ft`,
          },
          {
            label: "Installation",
            value: `₹${fmtINR(totalFixingCost)}`,
            sub: `${totalBlindWindows} units`,
          },
        ]
      : []),
  ];

  /* ─────────────────────────────────────────────
     PAGE 1 — SUMMARY
  ───────────────────────────────────────────── */
  const statCardsHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:20px 48px 0;">
      ${statCards
        .map(
          (s) => `
        <div style="flex:1;min-width:100px;border:1px solid ${BORDER_COLOR};border-radius:10px;padding:13px 15px;background:${BRAND_LIGHT};">
          <div style="font-size:9px;color:${ACCENT_GRAY};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px;">${s.label}</div>
          <div style="font-size:15px;font-weight:700;color:${BRAND_DARK};line-height:1.2;">${s.value}</div>
          <div style="font-size:10px;color:${ACCENT_GRAY};margin-top:3px;">${s.sub}</div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;

  const page1 = makeContainer(`
    ${headerHTML("Quotation Summary", "Quotation")}

    ${statCardsHTML}

    ${buildSummaryTable("Curtains — Cost Summary", curtainSummaryRows, "🪟")}
    ${buildSummaryTable("Blinds — Cost Summary", blindSummaryRows, "🌿")}

    <!-- Grand Total Card -->
    <div style="margin:28px 48px 0;">
      <div style="background:${BRAND_DARK};border-radius:10px;padding:20px 28px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Grand Total (Incl. All)</div>
          <div style="font-size:30px;font-weight:700;color:${BRAND_GOLD};line-height:1;">₹${fmtINR(grandTotal)}</div>
        </div>
        <div style="display:flex;gap:14px;align-items:center;">
          ${
            curtainTotal > 0
              ? `
            <div style="border:1.5px solid rgba(201,169,110,0.3);border-radius:8px;padding:10px 16px;text-align:center;">
              <div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Curtains</div>
              <div style="font-size:15px;font-weight:600;color:#fff;">₹${fmtINR(curtainTotal)}</div>
            </div>`
              : ""
          }
          ${
            blindTotal > 0
              ? `
            <div style="border:1.5px solid rgba(201,169,110,0.3);border-radius:8px;padding:10px 16px;text-align:center;">
              <div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Blinds</div>
              <div style="font-size:15px;font-weight:600;color:#fff;">₹${fmtINR(blindTotal)}</div>
            </div>`
              : ""
          }
          <div style="border:1.5px solid ${BRAND_GOLD};border-radius:8px;padding:10px 16px;text-align:center;">
            <div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Advance (60%)</div>
            <div style="font-size:15px;font-weight:600;color:${BRAND_GOLD};">₹${fmtINR(grandTotal * 0.6)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Terms -->
    <div style="margin:16px 48px 80px;">
      <div style="border:1px solid ${BORDER_COLOR};border-radius:8px;padding:14px 20px;background:${BRAND_LIGHT};">
        <div style="font-size:10px;font-weight:600;color:${BRAND_DARK};letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">Terms &amp; Conditions</div>
        <div style="display:flex;gap:24px;flex-wrap:wrap;">
          ${[
            ["Payment", "60% advance · Balance before delivery"],
            ["Delivery", "10–14 working days after advance"],
          ]
            .map(
              ([k, v]) => `
            <div style="min-width:180px;">
              <div style="font-size:9px;color:${ACCENT_GRAY};text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">${k}</div>
              <div style="font-size:11px;color:${BRAND_DARK};font-weight:500;">${v}</div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    </div>

    ${footerHTML(1, 2)}
  `);

  const canvas1 = await html2canvas(page1, { scale: 2, useCORS: true });
  pdf.addImage(canvas1.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
  document.body.removeChild(page1);

  /* ─────────────────────────────────────────────
     PAGE 2 — DETAILED BREAKDOWN (per window)
  ───────────────────────────────────────────── */
  const detailCards = windows
    .map((w, i) => {
      const c = allCalcs[i];
      const isCurtain = w.cat === "curtains" && c.selCurtain;
      const isBlind = w.cat === "blinds" && c.selBlind;
      const itemTotal = isCurtain
        ? c.curtainGrandTotal
        : isBlind
          ? c.blindTotal
          : 0;

      const rows: any[] = isCurtain
        ? [
            [
              "Fabric",
              `${c.totalClothMeters.toFixed(2)} m × ₹${w.clothPrice}`,
              c.curtainClothCost,
            ],
            [
              "Stitching",
              `${c.curtainCount} panels × ₹${stitchingCost}`,
              c.curtainStitch,
            ],
            ...(c.selTrack
              ? [
                  [
                    "Track",
                    `${c.wFt.toFixed(2)} ft × ₹${c.selTrack.pricePerFt}`,
                    c.trackTotal,
                  ] as [string, string, number],
                ]
              : []),
          ]
        : isBlind
          ? [
              [
                c?.selBlind?.name,
                `${c.sqFtRounded} sq.ft × ₹${c?.selBlind?.ratePerSqFt}`,
                c.blindBase,
              ],
              [
                "Installation",
                `Per unit · ₹${BLIND_FIXING_PER_UNIT}`,
                c.blindFixing,
              ],
            ]
          : [];

      const detailRows = rows
        .map(
          ([label, detail, amt], idx) => `
      <tr style="background:${idx % 2 === 0 ? "#fff" : ROW_ALT};">
        <td style="padding:8px 14px;font-size:11px;color:${BRAND_DARK};border-bottom:1px solid ${BORDER_COLOR};font-weight:500;">${label}</td>
        <td style="padding:8px 14px;font-size:11px;color:${ACCENT_GRAY};border-bottom:1px solid ${BORDER_COLOR};">${detail}</td>
        <td style="padding:8px 14px;font-size:11px;font-weight:600;text-align:right;border-bottom:1px solid ${BORDER_COLOR};">₹${fmtINR(amt)}</td>
      </tr>
    `,
        )
        .join("");

      return `
      <div style="border:1px solid ${BORDER_COLOR};border-radius:10px;overflow:hidden;margin-bottom:14px;">
        <div style="background:${BRAND_LIGHT};padding:11px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${BORDER_COLOR};">
          <div>
            <div style="font-size:14px;font-weight:600;color:${BRAND_DARK};font-family:'Cormorant Garamond',Georgia,serif;">${w.label}</div>
            <div style="font-size:10px;color:${ACCENT_GRAY};text-transform:uppercase;letter-spacing:1px;margin-top:2px;">
              ${w.cat === "curtains" ? "Curtain" : "Blind"} &nbsp;·&nbsp; ${c.wFt.toFixed(2)} × ${c.hFt.toFixed(2)} ft
            </div>
          </div>
          <div style="background:${BRAND_DARK};color:${BRAND_GOLD};padding:6px 14px;border-radius:6px;font-size:13px;font-weight:700;">₹${fmtINR(itemTotal)}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#F3F1EC;">
              <th style="padding:7px 14px;font-size:9px;text-align:left;color:${ACCENT_GRAY};letter-spacing:1.5px;text-transform:uppercase;font-weight:500;">Item</th>
              <th style="padding:7px 14px;font-size:9px;text-align:left;color:${ACCENT_GRAY};letter-spacing:1.5px;text-transform:uppercase;font-weight:500;">Calculation</th>
              <th style="padding:7px 14px;font-size:9px;text-align:right;color:${ACCENT_GRAY};letter-spacing:1.5px;text-transform:uppercase;font-weight:500;">Amount</th>
            </tr>
          </thead>
          <tbody>${detailRows}</tbody>
        </table>
      </div>
    `;
    })
    .join("");

  const page2 = makeContainer(`
    ${headerHTML("Detailed Breakdown — Window by Window", "Detail Sheet")}
    <div style="padding:24px 48px 80px;">${detailCards}</div>
    ${footerHTML(2, 2)}
  `);

  const canvas2 = await html2canvas(page2, { scale: 2, useCORS: true });
  pdf.addPage();
  pdf.addImage(canvas2.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
  document.body.removeChild(page2);

  /* ─────────────────────────────────────────────
     SAVE
  ───────────────────────────────────────────── */
  pdf.save(`Gruhasundari_${quoteNumber}.pdf`);
};

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
type Category = "blinds" | "curtains";
type Unit = "feet" | "inches";
// type TrackOptionId = "track_premium" | "track_standard" | null;

interface BlindProduct {
  id: string;
  name: string;
  icon: string;
  ratePerSqFt: number;
  tagline: string;
}
interface CurtainStyle {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  panelWidthIn: number;
}
interface TrackOption {
  id: string;
  label: string;
  desc: string;
  pricePerFt: number;
}

interface WindowEntry {
  id: string;
  label: string;
  cat: Category;
  unit: Unit;
  width: string;
  height: string;
  blindProd: string | null;
  curtainProd: string | null;
  clothPrice: string;
  trackOption: string | null;
  blindPrice: string; // custom rate override, empty = use product default
}

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const BLIND_FIXING_PER_UNIT = 150;
const STITCHING_PER_PANEL = 120;
const TRACK_FIXING_CHARGE = 150;

const BLINDS: BlindProduct[] = [
  {
    id: "roller",
    name: "Roller",
    icon: "◯",
    ratePerSqFt: 155,
    tagline: "Clean & minimal",
  },
  {
    id: "rbox",
    name: "Roller + Box",
    icon: "▣",
    ratePerSqFt: 180,
    tagline: "With pelmet box",
  },
  {
    id: "zebra",
    name: "Zebra",
    icon: "≋",
    ratePerSqFt: 225,
    tagline: "Dual-layer",
  },
  {
    id: "custom",
    name: "Customized",
    icon: "✦",
    ratePerSqFt: 225,
    tagline: "Bespoke design",
  },
  {
    id: "wooden",
    name: "Wooden",
    icon: "⊞",
    ratePerSqFt: 395,
    tagline: "Natural timber",
  },
  {
    id: "vertical",
    name: "Vertical",
    icon: "⫿",
    ratePerSqFt: 110,
    tagline: "Floor-to-ceiling",
  },
  {
    id: "exterior",
    name: "Exterior",
    icon: "⫿",
    ratePerSqFt: 145,
    tagline: "Rough and tough",
  },
];

const CURTAIN_STYLES: CurtainStyle[] = [
  {
    id: "frill",
    name: "Frill",
    icon: "❧",
    tagline: "Ruffled elegance",
    panelWidthIn: 22,
  },
  {
    id: "ring",
    name: "Ring",
    icon: "◎",
    tagline: "Classic eyelet",
    panelWidthIn: 32,
  },
];

const TRACK_OPTIONS: TrackOption[] = [
  {
    id: "track_premium",
    label: "Premium Track",
    desc: "Heavy-duty smooth glide",
    pricePerFt: 180,
  },
  {
    id: "track_standard",
    label: "Standard Track",
    desc: "Everyday smooth glide",
    pricePerFt: 110,
  },
];

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const toFeet = (v: number, u: Unit): number => (u === "inches" ? v / 12 : v);
const fmtINR = (n: number): string =>
  Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const calcCurtainCount = (widthFt: number, panelWidthIn: number): number =>
  Math.max(2, Math.ceil((widthFt * 12) / panelWidthIn));
const calcMetersPerCurtain = (heightFt: number): number =>
  (heightFt + 0.8333) * 0.35;

const makeWindow = (n: number): WindowEntry => ({
  id: crypto.randomUUID(),
  label: `Window ${n}`,
  cat: "blinds",
  unit: "feet",
  width: "",
  height: "",
  blindProd: null,
  curtainProd: null,
  clothPrice: "",
  trackOption: null,
  blindPrice: "",
});

interface WindowCalc {
  wFt: number;
  hFt: number;
  sqFt: number;
  sqFtRounded: number;
  blindBase: number;
  blindFixing: number;
  blindTotal: number;
  curtainCount: number;
  metersPerCurtain: number;
  totalClothMeters: number;
  curtainClothCost: number;
  curtainStitch: number;
  trackLineCost: number;
  trackTotal: number;
  curtainGrandTotal: number;
  windowTotal: number;
  selBlind: BlindProduct | null;
  selCurtain: CurtainStyle | null;
  selTrack: TrackOption | null;
}

function calcWindow(w: WindowEntry, stitchingCost: number): WindowCalc {
  const wFt = toFeet(parseFloat(w.width) || 0, w.unit);
  const hFt = toFeet(parseFloat(w.height) || 0, w.unit);
  const sqFt = wFt * hFt;

  const selBlind = w.blindProd
    ? (BLINDS.find((b) => b.id === w.blindProd) ?? null)
    : null;
  const selCurtain = w.curtainProd
    ? (CURTAIN_STYLES.find((c) => c.id === w.curtainProd) ?? null)
    : null;
  const selTrack = w.trackOption
    ? (TRACK_OPTIONS.find((t) => t.id === w.trackOption) ?? null)
    : null;

  const sqFtRounded = Math.round(sqFt);
  const blindRate = parseFloat(w.blindPrice) || selBlind?.ratePerSqFt || 0;
  const blindBase = selBlind && sqFt > 0 ? sqFtRounded * blindRate : 0;
  const blindFixing = selBlind && sqFt > 0 ? BLIND_FIXING_PER_UNIT : 0;
  const blindTotal = blindBase + blindFixing;

  const curtainCount =
    selCurtain && wFt > 0 ? calcCurtainCount(wFt, selCurtain.panelWidthIn) : 0;
  const metersPerCurtain = hFt > 0 ? calcMetersPerCurtain(hFt) : 0;
  const frillExtraFactor =
    selCurtain?.id === "frill"
      ? (selCurtain.panelWidthIn + 5) / selCurtain.panelWidthIn // 27/22 ≈ 1.227
      : 1;
  const totalClothMeters = curtainCount * metersPerCurtain * frillExtraFactor;
  const clothPriceNum = parseFloat(w.clothPrice) || 0;
  const curtainClothCost = totalClothMeters * clothPriceNum;
  const curtainStitch = selCurtain ? curtainCount * stitchingCost : 0;
  const trackLineCost = selTrack && wFt > 0 ? wFt * selTrack.pricePerFt : 0;
  const trackTotal = selTrack ? trackLineCost + TRACK_FIXING_CHARGE : 0;
  const curtainGrandTotal = curtainClothCost + curtainStitch + trackTotal;

  const windowTotal = w.cat === "blinds" ? blindTotal : curtainGrandTotal;

  return {
    wFt,
    hFt,
    sqFt,
    sqFtRounded,
    blindBase,
    blindFixing,
    blindTotal,
    curtainCount,
    metersPerCurtain,
    totalClothMeters,
    curtainClothCost,
    curtainStitch,
    trackLineCost,
    trackTotal,
    curtainGrandTotal,
    windowTotal,
    selBlind,
    selCurtain,
    selTrack,
  };
}

/* ─────────────────────────────────────────
   ANIMATED PRICE
───────────────────────────────────────── */
function AnimatedPrice({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  const from = useRef(0);
  const t0 = useRef(0);

  useEffect(() => {
    from.current = display;
    t0.current = performance.now();
    const dur = 700;
    const tick = (now: number) => {
      const t = Math.min((now - t0.current) / dur, 1);
      const e = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(from.current + (value - from.current) * e));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value]);

  return <>{fmtINR(display)}</>;
}

/* ─────────────────────────────────────────
   MOTION VARIANTS
───────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      delay: i * 0.07,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};
const swapSection = {
  hidden: { opacity: 0, x: -18 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: { opacity: 0, x: 18, transition: { duration: 0.22 } },
};
const cardIn = {
  hidden: { opacity: 0, scale: 0.9, y: 14 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.38,
      delay: i * 0.06,
      ease: [0.34, 1.3, 0.64, 1] as const,
    },
  }),
};
const slideDown = {
  hidden: { opacity: 0, height: 0, marginBottom: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    marginBottom: 24,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.28 },
  },
};

/* ─────────────────────────────────────────
   WINDOW CARD
───────────────────────────────────────── */
interface WindowCardProps {
  win: WindowEntry;
  index: number;
  total: number;
  stitchingCost: number;
  onChange: (updated: WindowEntry) => void;
  onRemove: () => void;
}

function WindowCard({
  win,
  index,
  total,
  stitchingCost,
  onChange,
  onRemove,
}: WindowCardProps) {
  const calc = calcWindow(win, stitchingCost);
  const set = <K extends keyof WindowEntry>(key: K, val: WindowEntry[K]) =>
    onChange({ ...win, [key]: val });

  const handleCat = (c: Category) =>
    onChange({
      ...win,
      cat: c,
      blindProd: null,
      curtainProd: null,
      trackOption: null,
    });

  return (
    <motion.div
      style={css.winCard}
      layout
      variants={slideDown}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Card header */}
      <div style={css.winHdr}>
        <div style={css.winHdrLeft}>
          <span style={css.winIndex}>{String(index + 1).padStart(2, "0")}</span>
          <input
            style={css.winLabelInput}
            value={win.label}
            onChange={(e) => set("label", e.target.value)}
            maxLength={32}
          />
        </div>
        <div style={css.winHdrRight}>
          {calc.windowTotal > 0 && (
            <span style={css.winSubtotal}>₹{fmtINR(calc.windowTotal)}</span>
          )}
          {total > 1 && (
            <motion.button
              style={css.removeBtn}
              onClick={onRemove}
              whileHover={{ background: "#fee2e2" }}
              whileTap={{ scale: 0.94 }}
            >
              ✕
            </motion.button>
          )}
        </div>
      </div>

      <div style={css.winBody}>
        {/* ── DIMENSIONS ── */}
        <div style={css.winSection}>
          <div style={css.winSecLabel}>DIMENSIONS</div>
          <div style={css.unitRow}>
            <span style={css.unitHint}>IN</span>
            <div style={css.utoggle}>
              {(["feet", "inches"] as Unit[]).map((u) => (
                <motion.button
                  key={u}
                  style={{ ...css.ubtn, ...(win.unit === u ? css.ubtnOn : {}) }}
                  onClick={() => set("unit", u)}
                  whileTap={{ scale: 0.95 }}
                >
                  {u === "feet" ? "FT" : "IN"}
                </motion.button>
              ))}
            </div>
          </div>
          <div style={css.dimGrid}>
            <DimInput
              label="↔ WIDTH"
              unit={win.unit}
              value={win.width}
              onChange={(v) => set("width", v)}
            />
            <DimInput
              label="↕ HEIGHT"
              unit={win.unit}
              value={win.height}
              onChange={(v) => set("height", v)}
            />
          </div>
          <AnimatePresence>
            {calc.sqFt > 0 && (
              <motion.div
                style={css.areaBadge}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {calc.sqFt.toFixed(2)} sq.ft
                {win.cat === "blinds" &&
                calc.sqFtRounded !== parseFloat(calc.sqFt.toFixed(2))
                  ? ` → ${calc.sqFtRounded} sq.ft (rounded)`
                  : ""}{" "}
                · {calc.wFt.toFixed(2)} ft W × {calc.hFt.toFixed(2)} ft H
                {win.cat === "curtains" &&
                  calc.selCurtain &&
                  calc.curtainCount > 0 && (
                    <>
                      {" "}
                      · <strong>{calc.curtainCount} panels</strong>,{" "}
                      {calc.metersPerCurtain.toFixed(2)} m ea
                    </>
                  )}{" "}
                {calc?.selCurtain?.id === "frill" && (
                  <span style={{ color: "#aaa" }}>
                    {" "}
                    (+5" frill allowance / panel)
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── CATEGORY ── */}
        <div style={css.winSection}>
          <div style={css.winSecLabel}>CATEGORY</div>
          <div style={css.catGrid}>
            {(["blinds", "curtains"] as Category[]).map((c) => {
              const on = win.cat === c;
              return (
                <motion.button
                  key={c}
                  onClick={() => handleCat(c)}
                  style={{
                    ...css.catBtn,
                    background: on ? "#111" : "#fff",
                    borderColor: on ? "#111" : "#e0e0e0",
                  }}
                  whileHover={
                    !on
                      ? { y: -2, boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }
                      : {}
                  }
                  whileTap={{ scale: 0.97 }}
                >
                  <span style={css.catIcon}>
                    {c === "blinds" ? "🪟" : "🏮"}
                  </span>
                  <span style={{ ...css.catName, color: on ? "#fff" : "#111" }}>
                    {c.toUpperCase()}
                  </span>
                  <span
                    style={{
                      ...css.catSub,
                      color: on ? "rgba(255,255,255,0.5)" : "#aaa",
                    }}
                  >
                    {c === "blinds" ? "6 styles · sq.ft" : "auto panel count"}
                  </span>
                  {on && (
                    <motion.span
                      style={css.catTick}
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 18,
                      }}
                    >
                      ✓
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── STYLE ── */}
        <div style={css.winSection}>
          <div style={css.winSecLabel}>
            {win.cat === "blinds" ? "BLIND STYLE" : "CURTAIN STYLE"}
          </div>
          <AnimatePresence mode="wait">
            {win.cat === "blinds" ? (
              <>
                <motion.div
                  key="blinds"
                  style={css.optGrid}
                  variants={swapSection}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {BLINDS.map((b, i) => {
                    const on = win.blindProd === b.id;
                    return (
                      <motion.button
                        key={b.id}
                        onClick={() => set("blindProd", b.id)}
                        style={{
                          ...css.optCard,
                          background: on ? "#111" : "#fff",
                          borderColor: on ? "#111" : "#e0e0e0",
                        }}
                        variants={cardIn}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        whileHover={
                          !on
                            ? { y: -3, boxShadow: "0 6px 22px rgba(0,0,0,0.1)" }
                            : {}
                        }
                        whileTap={{ scale: 0.96 }}
                      >
                        <span
                          style={{
                            ...css.optIcon,
                            display: "block",
                            fontSize: 18,
                            marginBottom: 8,
                          }}
                        >
                          {b.icon}
                        </span>
                        <span
                          style={{
                            ...css.optName,
                            color: on ? "#fff" : "#111",
                          }}
                        >
                          {b.name}
                        </span>
                        <span
                          style={{
                            ...css.optTag,
                            color: on ? "rgba(255,255,255,0.55)" : "#999",
                          }}
                        >
                          {b.tagline}
                        </span>
                        <span
                          style={{
                            ...css.optRate,
                            color: on ? "rgba(255,255,255,0.7)" : "#555",
                          }}
                        >
                          ₹{b.ratePerSqFt}/sq.ft
                        </span>
                        {on && (
                          <motion.span
                            style={css.optCheck}
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 20,
                            }}
                          >
                            ✓
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>
                {win.blindProd && (
                  <AnimatePresence>
                    <motion.div
                      style={css.clothBox}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div style={{ paddingTop: 16 }}>
                        <span style={css.clothLabelMain}>RATE / SQ.FT</span>
                        <ClothInput
                          value={win.blindPrice}
                          onChange={(v) => set("blindPrice", v)}
                          //   placeholder={`default ₹${calc.selBlind?.ratePerSqFt}`}
                        />
                        {calc.sqFt > 0 &&
                          (parseFloat(win.blindPrice) > 0 || calc.selBlind) && (
                            <div style={css.clothNote}>
                              {calc.sqFtRounded} sq.ft × ₹
                              {parseFloat(win.blindPrice) ||
                                calc.selBlind?.ratePerSqFt}
                              = <b>₹{fmtINR(calc.blindBase)}</b>
                            </div>
                          )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </>
            ) : (
              <motion.div
                key="curtains"
                variants={swapSection}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div style={css.curtainGrid}>
                  {CURTAIN_STYLES.map((c, i) => {
                    const on = win.curtainProd === c.id;
                    return (
                      <motion.button
                        key={c.id}
                        onClick={() => set("curtainProd", c.id)}
                        style={{
                          ...css.curtainCard,
                          background: on ? "#111" : "#fff",
                          borderColor: on ? "#111" : "#e0e0e0",
                        }}
                        variants={cardIn}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        whileHover={
                          !on
                            ? { y: -2, boxShadow: "0 6px 22px rgba(0,0,0,0.1)" }
                            : {}
                        }
                        whileTap={{ scale: 0.97 }}
                      >
                        <span
                          style={{
                            ...css.optIcon,
                            fontSize: 22,
                            display: "block",
                            marginBottom: 8,
                          }}
                        >
                          {c.icon}
                        </span>
                        <span
                          style={{
                            ...css.optName,
                            color: on ? "#fff" : "#111",
                            fontSize: 12,
                            letterSpacing: "3px",
                          }}
                        >
                          {c.name}
                        </span>
                        <span
                          style={{
                            ...css.optTag,
                            color: on ? "rgba(255,255,255,0.55)" : "#999",
                          }}
                        >
                          {c.tagline}
                        </span>
                        <span
                          style={{
                            ...css.optRate,
                            color: on ? "rgba(255,255,255,0.7)" : "#555",
                          }}
                        >
                          Panel: {c.panelWidthIn}" shirked
                        </span>
                        <span
                          style={{
                            ...css.optRate,
                            color: on ? "rgba(255,255,255,0.55)" : "#888",
                            marginTop: 2,
                          }}
                        >
                          ₹{stitchingCost}/panel
                        </span>
                        {on && (
                          <motion.span
                            style={css.optCheck}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500 }}
                          >
                            ✓
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Cloth price */}
                <AnimatePresence>
                  {win.curtainProd && (
                    <motion.div
                      style={css.clothBox}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div style={{ paddingTop: 16 }}>
                        <span style={css.clothLabelMain}>
                          CLOTH PRICE / METER
                        </span>
                        <ClothInput
                          value={win.clothPrice}
                          onChange={(v) => set("clothPrice", v)}
                        />
                        <AnimatePresence>
                          {calc.wFt > 0 &&
                            calc.hFt > 0 &&
                            calc.curtainCount > 0 && (
                              <motion.div
                                style={css.clothNote}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                              >
                                <strong>{calc.curtainCount} panels</strong> ×{" "}
                                {calc.metersPerCurtain.toFixed(2)} m ={" "}
                                <strong>
                                  {calc.totalClothMeters.toFixed(2)} m
                                </strong>
                                {parseFloat(win.clothPrice) > 0 && (
                                  <>
                                    {" "}
                                    &nbsp;× ₹{win.clothPrice}/m ={" "}
                                    <b>₹{fmtINR(calc.curtainClothCost)}</b>
                                  </>
                                )}
                                {calc.selCurtain && (
                                  <>
                                    {" "}
                                    &nbsp;+ Stitching {calc.curtainCount} × ₹
                                    {STITCHING_PER_PANEL} ={" "}
                                    <b>₹{fmtINR(calc.curtainStitch)}</b>
                                  </>
                                )}
                              </motion.div>
                            )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Track */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ ...css.winSecLabel, marginBottom: 10 }}>
                    TRACK RAIL &nbsp;
                    <span style={{ color: "#ccc", fontWeight: 400 }}>
                      optional · ₹/ft + ₹{TRACK_FIXING_CHARGE} fixing
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap" as const,
                    }}
                  >
                    {/* No track */}
                    <TrackBtn
                      label="No Track"
                      desc="Customer arranges"
                      price="—"
                      active={win.trackOption === null}
                      onClick={() => set("trackOption", null)}
                    />
                    {TRACK_OPTIONS.map((t) => (
                      <TrackBtn
                        key={t.id}
                        label={t.label}
                        desc={t.desc}
                        price={`₹${t.pricePerFt}/ft`}
                        active={win.trackOption === t.id}
                        onClick={() => set("trackOption", t.id)}
                      />
                    ))}
                  </div>
                  <AnimatePresence>
                    {calc.selTrack && calc.wFt > 0 && (
                      <motion.div
                        style={{
                          ...css.clothNote,
                          background: "#f9f9f9",
                          padding: "8px 12px",
                          border: "1px solid #eee",
                          marginTop: 8,
                        }}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        {calc.wFt.toFixed(2)} ft × ₹{calc.selTrack.pricePerFt} ={" "}
                        <b>₹{fmtINR(calc.trackLineCost)}</b>
                        &nbsp;+ fixing <b>₹{TRACK_FIXING_CHARGE}</b> ={" "}
                        <b>₹{fmtINR(calc.trackTotal)}</b>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── PER-WINDOW BREAKDOWN ── */}
        <AnimatePresence>
          {calc.windowTotal > 0 && (
            <motion.div
              style={css.winBreakdown}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {win.cat === "blinds" && calc.selBlind && calc.sqFt > 0 && (
                <>
                  <MiniRow
                    l={`${calc.selBlind.name} · ${calc.sqFtRounded} sq.ft × ₹${calc.selBlind.ratePerSqFt}`}
                    v={`₹${fmtINR(calc.blindBase)}`}
                  />
                  <MiniRow
                    l={`Fixing (1 unit × ₹${BLIND_FIXING_PER_UNIT})`}
                    v={`₹${fmtINR(calc.blindFixing)}`}
                  />
                  <MiniRow
                    l="Window total"
                    v={`₹${fmtINR(calc.blindTotal)}`}
                    bold
                  />
                </>
              )}
              {win.cat === "curtains" && calc.selCurtain && (
                <>
                  <MiniRow
                    l={`${calc.curtainCount} panels × ${calc.metersPerCurtain.toFixed(2)} m = ${calc.totalClothMeters.toFixed(2)} m cloth`}
                    v={
                      parseFloat(win.clothPrice) > 0
                        ? `₹${fmtINR(calc.curtainClothCost)}`
                        : "—"
                    }
                  />
                  <MiniRow
                    l={`Stitching (${calc.curtainCount} panels × ₹${STITCHING_PER_PANEL})`}
                    v={`₹${fmtINR(calc.curtainStitch)}`}
                  />
                  {calc.selTrack && (
                    <MiniRow
                      l={`${calc.selTrack.label} + fixing`}
                      v={`₹${fmtINR(calc.trackTotal)}`}
                    />
                  )}
                  <MiniRow
                    l="Window total"
                    v={`₹${fmtINR(calc.curtainGrandTotal)}`}
                    bold
                  />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* TrackBtn helper */
function TrackBtn({
  label,
  desc,
  price,
  active,
  onClick,
}: {
  label: string;
  desc: string;
  price: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      style={{
        ...css.addonBtn,
        background: active ? "#111" : "#fff",
        borderColor: active ? "#111" : "#e0e0e0",
      }}
      whileHover={!active ? { x: 3 } : {}}
      whileTap={{ scale: 0.97 }}
    >
      <span style={css.addonIcon}>{active ? "✓" : "⟼"}</span>
      <div>
        <span style={{ ...css.addonName, color: active ? "#fff" : "#111" }}>
          {label}
        </span>
        <span
          style={{
            ...css.addonDesc,
            color: active ? "rgba(255,255,255,0.5)" : "#aaa",
          }}
        >
          {desc}
        </span>
      </div>
      <span
        style={{
          ...css.addonPrice,
          color: active ? "rgba(255,255,255,0.7)" : "#777",
        }}
      >
        {price}
      </span>
    </motion.button>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function GruhasundariAdminEstimate() {
  const [windows, setWindows] = useState<WindowEntry[]>([makeWindow(1)]);
  const [stitchingCost, setStitchingCost] = useState(150);
  const [toast, setToast] = useState<string | null>(null);

  const addWindow = () =>
    setWindows((prev) => [...prev, makeWindow(prev.length + 1)]);
  const removeWindow = (id: string) =>
    setWindows((prev) => prev.filter((w) => w.id !== id));
  const updateWindow = (id: string, updated: WindowEntry) =>
    setWindows((prev) => prev.map((w) => (w.id === id ? updated : w)));

  const allCalcs = windows.map((w) => calcWindow(w, stitchingCost));
  const grandTotal = allCalcs.reduce((s, c) => s + c.windowTotal, 0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3400);
  };

  const handleQuote = async () => {
    const incomplete = windows.some((w) => {
      if (!w.width || !w.height) return true;
      if (w.cat === "blinds" && !w.blindProd) return true;
      if (w.cat === "curtains" && (!w.curtainProd || !w.clothPrice))
        return true;
      return false;
    });

    if (incomplete) {
      showToast("⚠  Please complete all window entries first");
      return;
    }

    // 👉 Generate PDF
    await generatePDF(windows, allCalcs, grandTotal, stitchingCost);

    // 👉 Then WhatsApp
    const msg = encodeURIComponent(
      "Hi, sharing my estimate. Please check PDF.",
    );
    window.open(`https://wa.me/918074008026?text=${msg}`, "_blank");
  };

  return (
    <div style={css.root}>
      <div style={css.bgGrid} />
      <div style={css.blob1} />
      <div style={css.blob2} />

      <div style={css.page}>
        {/* ── HEADER ── */}
        <motion.header
          style={css.hdr}
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            style={css.brandRow}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            <div style={css.logoLine} />
            <div style={css.logoDiamond} />
            <span style={css.wordmark}>Gruhasundari</span>
            <div style={css.logoDiamond} />
            <div style={css.logoLine} />
          </motion.div>
          <motion.h1
            style={css.h1}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.25,
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            Estimate
            <br />
            <em style={css.h1em}>Studio</em>
          </motion.h1>
          <motion.p
            style={css.h1sub}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.6 }}
          >
            BLINDS · CURTAINS · PRECISION PRICING
          </motion.p>
          <div style={css.hdrRule} />
        </motion.header>
        <motion.div
          style={{
            background: "#fff",
            border: "1px solid #e0e0e0",
            padding: "20px 24px",
            marginBottom: 24,
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 4,
              color: "#aaa",
              marginBottom: 10,
            }}
          >
            GLOBAL SETTINGS
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, letterSpacing: 2 }}>
              CURTAIN STITCHING / PANEL
            </span>

            <div style={{ display: "flex", border: "1px solid #ddd" }}>
              <span style={{ padding: "8px 10px", color: "#aaa" }}>₹</span>
              <input
                type="number"
                value={stitchingCost}
                onChange={(e) => setStitchingCost(Number(e.target.value))}
                style={{
                  border: "none",
                  outline: "none",
                  padding: "8px 10px",
                  width: 80,
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* ── WINDOWS LIST ── */}
        <AnimatePresence>
          {windows.map((win, i) => (
            <WindowCard
              key={win.id}
              win={win}
              index={i}
              total={windows.length}
              stitchingCost={stitchingCost}
              onChange={(updated) => updateWindow(win.id, updated)}
              onRemove={() => removeWindow(win.id)}
            />
          ))}
        </AnimatePresence>

        {/* ── ADD WINDOW ── */}
        <motion.button
          style={css.addBtn}
          onClick={addWindow}
          whileHover={{ background: "#f0f0f0", borderColor: "#999" }}
          whileTap={{ scale: 0.98 }}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <span style={css.addBtnPlus}>+</span>
          <span>ADD ANOTHER WINDOW</span>
        </motion.button>

        {/* ── GRAND TOTAL ── */}
        <motion.div
          style={css.result}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          layout
        >
          <div style={css.rHdr}>
            <span style={css.rLbl}>
              {windows.length > 1
                ? `TOTAL FOR ${windows.length} WINDOWS`
                : "YOUR ESTIMATE"}
            </span>
            <span style={css.rSub}>GRUHASUNDARI</span>
          </div>
          <div style={css.priceRow}>
            <span style={css.pCur}>₹</span>
            <span style={css.pAmt}>
              <AnimatedPrice value={grandTotal} />
            </span>
          </div>

          <AnimatePresence mode="wait">
            {grandTotal > 0 ? (
              <motion.div
                key="breakdown"
                style={css.bdown}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {windows.map((win, i) => {
                  const c = allCalcs[i];
                  if (c.windowTotal === 0) return null;
                  return (
                    <BRow
                      key={win.id}
                      l={win.label}
                      v={`₹${fmtINR(c.windowTotal)}`}
                      bold={windows.length === 1}
                    />
                  );
                })}
                {windows.length > 1 && grandTotal > 0 && (
                  <BRow l="Grand Total" v={`₹${fmtINR(grandTotal)}`} bold />
                )}
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                style={css.rHint}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Fill in window details to see your estimate
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── CTA ── */}
        <motion.button
          style={css.cta}
          onClick={handleQuote}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          whileHover={{
            backgroundColor: "#111",
            color: "#fff",
            letterSpacing: "6px",
          }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.3 }}
        >
          <span>SEND QUOTE ON WHATSAPP</span>
          <motion.span
            animate={{ x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          >
            →
          </motion.span>
        </motion.button>

        <motion.p
          style={css.footer}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
        >
          GRUHASUNDARI · WINDOW FURNISHINGS · ESTIMATES ARE INDICATIVE
        </motion.p>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            style={css.toast}
            initial={{ opacity: 0, y: 44, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────── */
function DimInput({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: Unit;
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div style={css.dimLbl}>{label}</div>
      <motion.div
        style={{ ...css.dimWrap, borderColor: focused ? "#111" : "#ddd" }}
        animate={
          focused
            ? { boxShadow: "0 0 0 3px rgba(17,17,17,0.1)" }
            : { boxShadow: "none" }
        }
      >
        <input
          type="number"
          value={value}
          placeholder="0"
          min={0}
          step={unit === "feet" ? 0.5 : 1}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={css.dimInput}
        />
        <span style={css.dimUnit}>{unit === "feet" ? "FT" : "IN"}</span>
      </motion.div>
    </div>
  );
}

function ClothInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <motion.div
      style={{
        ...css.dimWrap,
        maxWidth: 240,
        marginTop: 10,
        borderColor: focused ? "#111" : "#ddd",
      }}
      animate={
        focused
          ? { boxShadow: "0 0 0 3px rgba(17,17,17,0.1)" }
          : { boxShadow: "none" }
      }
    >
      <span
        style={{
          padding: "0 12px",
          fontSize: 20,
          color: "#aaa",
          borderRight: "1px solid #eee",
          fontFamily: "'Cormorant Garamond',serif",
        }}
      >
        ₹
      </span>
      <input
        type="number"
        value={value}
        placeholder="e.g. 350"
        min={0}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...css.dimInput, fontSize: 18 }}
      />
      <span style={css.dimUnit}>/ M</span>
    </motion.div>
  );
}

function BRow({
  l,
  v,
  bold = false,
}: {
  l: string;
  v: string;
  bold?: boolean;
}) {
  return (
    <div style={{ ...css.brow, ...(bold ? css.browBold : {}) }}>
      <span style={css.bl}>{l}</span>
      <span
        style={{ ...css.bv, ...(bold ? { fontSize: 14, color: "#fff" } : {}) }}
      >
        {v}
      </span>
    </div>
  );
}

function MiniRow({
  l,
  v,
  bold = false,
}: {
  l: string;
  v: string;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "4px 0",
        borderTop: bold ? "1px solid rgba(17,17,17,0.08)" : "none",
        marginTop: bold ? 4 : 0,
      }}
    >
      <span
        style={{
          fontSize: 10,
          color: bold ? "#333" : "#888",
          letterSpacing: 0.3,
        }}
      >
        {l}
      </span>
      <span
        style={{
          fontSize: bold ? 12 : 11,
          color: bold ? "#111" : "#666",
          fontWeight: bold ? 600 : 400,
        }}
      >
        {v}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────
   STYLES
───────────────────────────────────────── */
const css: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#f8f8f8",
    color: "#111",
    fontFamily: "'Jost','Helvetica Neue',sans-serif",
    position: "relative",
    overflowX: "hidden",
  },
  bgGrid: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    backgroundImage:
      "linear-gradient(#e4e4e4 1px,transparent 1px),linear-gradient(90deg,#e4e4e4 1px,transparent 1px)",
    backgroundSize: "72px 72px",
    opacity: 0.55,
  },
  blob1: {
    position: "fixed",
    top: -180,
    right: -120,
    width: 560,
    height: 560,
    borderRadius: "50%",
    background: "#bbb",
    opacity: 0.07,
    pointerEvents: "none",
    zIndex: 0,
  },
  blob2: {
    position: "fixed",
    bottom: -120,
    left: -80,
    width: 440,
    height: 440,
    borderRadius: "50%",
    background: "#999",
    opacity: 0.06,
    pointerEvents: "none",
    zIndex: 0,
  },
  page: {
    position: "relative",
    zIndex: 1,
    maxWidth: 960,
    margin: "0 auto",
    padding: "0 32px 100px",
  },

  hdr: {
    textAlign: "center",
    padding: "64px 0 48px",
    borderBottom: "1px solid #ddd",
    marginBottom: 48,
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 22,
  },
  logoLine: { width: 44, height: 1, background: "#bbb" },
  logoDiamond: {
    width: 7,
    height: 7,
    background: "#333",
    transform: "rotate(45deg)",
  },
  wordmark: {
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    fontSize: 14,
    letterSpacing: 8,
    fontWeight: 400,
    color: "#666",
    textTransform: "uppercase",
  },
  h1: {
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    fontSize: "clamp(56px,9vw,96px)",
    fontWeight: 300,
    lineHeight: 0.9,
    letterSpacing: -1,
    color: "#111",
    margin: "0 0 16px",
  },
  h1em: { fontStyle: "italic", color: "#777", fontWeight: 300 },
  h1sub: { fontSize: 11, letterSpacing: 5, color: "#aaa", fontWeight: 400 },
  hdrRule: { width: 60, height: 2, background: "#222", margin: "28px auto 0" },

  // Window card
  winCard: {
    background: "#fff",
    border: "1px solid #e0e0e0",
    marginBottom: 24,
    overflow: "hidden",
  },
  winHdr: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "1px solid #f0f0f0",
    background: "#fafafa",
  },
  winHdrLeft: { display: "flex", alignItems: "center", gap: 14 },
  winHdrRight: { display: "flex", alignItems: "center", gap: 14 },
  winIndex: {
    fontSize: 10,
    letterSpacing: 3,
    color: "#ccc",
    fontWeight: 600,
    fontFamily: "'Cormorant Garamond',serif",
  },
  winLabelInput: {
    fontSize: 12,
    letterSpacing: 3,
    color: "#444",
    fontWeight: 600,
    border: "none",
    background: "transparent",
    outline: "none",
    fontFamily: "'Jost',sans-serif",
    textTransform: "uppercase",
    width: 200,
  },
  winSubtotal: {
    fontSize: 13,
    fontFamily: "'Cormorant Garamond',serif",
    color: "#555",
    letterSpacing: 1,
  },
  removeBtn: {
    width: 28,
    height: 28,
    border: "1px solid #eee",
    background: "#fff",
    borderRadius: 0,
    cursor: "pointer",
    fontSize: 10,
    color: "#aaa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  winBody: { padding: "28px 28px 24px" },
  winSection: { marginBottom: 28 },
  winSecLabel: {
    fontSize: 10,
    letterSpacing: 4,
    color: "#aaa",
    fontWeight: 600,
    marginBottom: 14,
  },
  winBreakdown: {
    background: "#f9f9f9",
    border: "1px solid #ececec",
    padding: "14px 18px",
    marginTop: 4,
  },

  // Add window button
  addBtn: {
    width: "100%",
    padding: "16px 28px",
    background: "#fff",
    border: "1px dashed #ccc",
    fontSize: 10,
    letterSpacing: 4,
    color: "#aaa",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 32,
    transition: "all .2s",
  },
  addBtnPlus: { fontSize: 20, lineHeight: 1, color: "#bbb" },

  unitRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  unitHint: { fontSize: 10, letterSpacing: 3, color: "#bbb" },
  utoggle: { display: "flex", border: "1px solid #ddd", overflow: "hidden" },
  ubtn: {
    padding: "7px 16px",
    background: "transparent",
    border: "none",
    color: "#999",
    fontSize: 10,
    letterSpacing: 2,
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 500,
  },
  ubtnOn: { background: "#111", color: "#fff" },

  dimGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  dimLbl: { fontSize: 10, letterSpacing: 3, color: "#aaa", marginBottom: 7 },
  dimWrap: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #ddd",
    background: "#fff",
    overflow: "hidden",
    transition: "border-color .2s",
  },
  dimInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#111",
    fontSize: 24,
    fontWeight: 300,
    padding: "11px 14px",
    outline: "none",
    fontFamily: "'Cormorant Garamond',serif",
    width: "100%",
  },
  dimUnit: {
    padding: "0 12px",
    fontSize: 10,
    letterSpacing: 2,
    color: "#aaa",
    borderLeft: "1px solid #eee",
    whiteSpace: "nowrap",
    fontWeight: 500,
  },
  areaBadge: {
    marginTop: 8,
    fontSize: 10,
    letterSpacing: 1.5,
    color: "#888",
    border: "1px solid #e0e0e0",
    padding: "4px 12px",
    display: "inline-block",
    background: "#fff",
  },

  catGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  catBtn: {
    padding: "20px 18px",
    border: "1px solid #e0e0e0",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
    position: "relative",
    transition: "background .3s,border-color .3s",
  },
  catIcon: { fontSize: 22, display: "block", marginBottom: 8 },
  catName: {
    display: "block",
    fontSize: 12,
    letterSpacing: 4,
    fontWeight: 600,
    marginBottom: 4,
  },
  catSub: { display: "block", fontSize: 9, letterSpacing: 1.5 },
  catTick: {
    position: "absolute",
    top: 10,
    right: 12,
    fontSize: 11,
    color: "#fff",
    fontWeight: 700,
  },

  optGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))",
    gap: 10,
  },
  optCard: {
    padding: "16px 12px",
    border: "1px solid #e0e0e0",
    cursor: "pointer",
    textAlign: "center",
    position: "relative",
    fontFamily: "inherit",
    transition: "background .25s,border-color .25s",
  },
  curtainGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 4,
  },
  curtainCard: {
    padding: "20px 18px",
    border: "1px solid #e0e0e0",
    cursor: "pointer",
    textAlign: "left",
    position: "relative",
    fontFamily: "inherit",
    transition: "background .25s,border-color .25s",
  },
  optIcon: {
    display: "block",
    fontSize: 18,
    marginBottom: 8,
    letterSpacing: 0,
  },
  optName: {
    display: "block",
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: 600,
    marginBottom: 4,
  },
  optTag: { display: "block", fontSize: 9, marginBottom: 5 },
  optRate: { display: "block", fontSize: 9, letterSpacing: 0.8 },
  optCheck: {
    position: "absolute",
    top: 7,
    right: 9,
    fontSize: 10,
    color: "#fff",
    fontWeight: 700,
  },

  clothBox: {
    background: "#fafafa",
    border: "1px solid #ebebeb",
    padding: "0 18px 16px",
    overflow: "hidden",
    marginTop: 12,
  },
  clothLabelMain: {
    display: "block",
    fontSize: 10,
    letterSpacing: 3,
    color: "#666",
    fontWeight: 600,
    marginBottom: 2,
  },
  clothNote: {
    marginTop: 10,
    fontSize: 10,
    color: "#999",
    letterSpacing: 0.3,
    borderTop: "1px solid #f0f0f0",
    paddingTop: 8,
  },

  addonBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 16px",
    border: "1px solid #e0e0e0",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background .25s,border-color .25s",
    position: "relative",
  },
  addonIcon: { fontSize: 14 },
  addonName: {
    display: "block",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: 600,
    marginBottom: 2,
  },
  addonDesc: { display: "block", fontSize: 9 },
  addonPrice: { fontSize: 10, letterSpacing: 1, marginLeft: 6 },

  result: {
    background: "#111",
    color: "#fff",
    padding: "44px 44px 40px",
    marginBottom: 24,
    position: "relative",
  },
  rHdr: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  rLbl: {
    fontSize: 10,
    letterSpacing: 5,
    color: "rgba(255,255,255,0.4)",
    fontWeight: 300,
  },
  rSub: { fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,0.2)" },
  priceRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 28,
  },
  pCur: {
    fontFamily: "'Cormorant Garamond',serif",
    fontSize: 28,
    color: "rgba(255,255,255,0.35)",
    paddingTop: 12,
    fontWeight: 300,
  },
  pAmt: {
    fontFamily: "'Cormorant Garamond',serif",
    fontSize: "clamp(60px,10vw,92px)",
    fontWeight: 300,
    lineHeight: 1,
    letterSpacing: -2,
    color: "#fff",
  },
  bdown: {
    borderTop: "1px solid rgba(255,255,255,0.1)",
    paddingTop: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  brow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  browBold: {
    borderTop: "1px solid rgba(255,255,255,0.12)",
    paddingTop: 12,
    marginTop: 4,
  },
  bl: { fontSize: 10, color: "rgba(255,255,255,0.38)", letterSpacing: 0.5 },
  bv: { fontSize: 12, color: "rgba(255,255,255,0.72)", fontWeight: 400 },
  rHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.28)",
    textAlign: "center",
    padding: "12px 0",
    letterSpacing: 1.5,
  },

  cta: {
    width: "100%",
    padding: "20px 32px",
    background: "transparent",
    color: "#111",
    border: "1px solid #111",
    fontSize: 11,
    letterSpacing: "4px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  footer: { textAlign: "center", fontSize: 9, letterSpacing: 3, color: "#ccc" },
  toast: {
    position: "fixed",
    bottom: 28,
    left: "50%",
    background: "#111",
    color: "#fff",
    padding: "13px 28px",
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: 500,
    zIndex: 999,
    whiteSpace: "nowrap",
    fontFamily: "inherit",
    borderTop: "2px solid #555",
  },
};
