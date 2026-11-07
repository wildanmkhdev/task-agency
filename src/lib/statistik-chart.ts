import { Chart as ChartJS, type BarElement, type Plugin } from "chart.js";

const BAR_POSITION: ["x", "y", "base"] = ["x", "y", "base"];

/** Label mengikuti posisi batang; batang pendek tetap mendapat angka yang terbaca. */
export const statistikBarLabels: Plugin<"bar", { labels: readonly string[] }> = {
  id: "statistikBarLabels",
  defaults: { labels: [] },
  afterDatasetsDraw(chart, _args, { labels }) {
    const { ctx, chartArea } = chart;
    const bars = chart.getDatasetMeta(0).data;
    const maxLabelWidth = Math.max(1, chartArea.right - chartArea.left - 16);

    ctx.save();
    ctx.font = `600 12px ${chart.options.font?.family ?? ChartJS.defaults.font.family}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    for (let i = 0; i < bars.length; i++) {
      const label = labels[i];
      if (label === undefined) continue;

      const bar = bars[i] as BarElement;
      const { x: barX, y: barY, base } = bar.getProps(BAR_POSITION);
      if (barX === null || barY === null) continue;
      const labelWidth = Math.min(ctx.measureText(label).width, maxLabelWidth);
      const inside = Math.abs(barX - base) >= labelWidth + 16;
      const x = inside
        ? barX - labelWidth - 8
        : Math.max(
            chartArea.left + 8,
            Math.min(barX + 8, chartArea.right - labelWidth - 8)
          );

      if (!inside) {
        ctx.fillStyle = "#0f2a20";
        ctx.fillRect(x - 3, barY - 9, labelWidth + 6, 18);
      }
      ctx.fillStyle = inside ? "#10231a" : "#f4efe2";
      ctx.fillText(label, x, barY, labelWidth);
    }

    ctx.restore();
  },
};
