import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import { findTable } from '@tiptap/pm/tables';
import {
  BarChart3,
  PieChart,
  LineChart,
  TrendingUp,
  X,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  Table as TableIcon,
  Download,
  Sparkles,
  ArrowUpDown,
  CircleDot,
  LayoutGrid,
  Palette,
  Shuffle,
} from 'lucide-react';

export type ChartType = 'column' | 'bar' | 'line' | 'area' | 'pie' | 'doughnut';
export type ChartWidthOption = 600 | 800 | 900 | 1200;

export interface ChartGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  onNotify?: (message: string) => void;
}

interface ChartDataset {
  label: string;
  data: number[];
  color: string;
}

const PALETTES: Record<string, string[]> = {
  vibrant: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1'],
  cyber: ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16', '#a855f7', '#0ea5e9'],
  pastel: ['#38bdf8', '#4ade80', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf', '#f472b6', '#fb923c', '#818cf8', '#6ee7b7'],
  contrast: ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#ea580c', '#4f46e5', '#db2777', '#059669'],
  sunset: ['#e11d48', '#ea580c', '#f59e0b', '#d97706', '#b45309', '#991b1b', '#be123c', '#fb923c', '#f97316', '#fbbf24'],
  emerald: ['#059669', '#0284c7', '#10b981', '#06b6d4', '#0d9488', '#3b82f6', '#34d399', '#38bdf8', '#14b8a6', '#60a5fa'],
  modern: ['#0284c7', '#0d9488', '#d97706', '#e11d48', '#7c3aed', '#2563eb', '#059669', '#ea580c', '#4f46e5', '#db2777'],
  berries: ['#be185d', '#831843', '#701a75', '#4c1d95', '#1e3a8a', '#9d174d', '#c026d3', '#6366f1', '#e11d48', '#db2777'],
};

const PALETTE_LABELS: Record<string, string> = {
  vibrant: 'Vibrant Rainbow',
  cyber: 'Cyber Neon',
  pastel: 'Soft Pastel',
  contrast: 'High Contrast',
  sunset: 'Sunset Warm',
  emerald: 'Emerald Ocean',
  modern: 'Office Modern',
  berries: 'Berry & Jewel',
};

const SAMPLE_TEMPLATES: Record<
  string,
  { title: string; labels: string[]; datasets: { label: string; data: number[] }[] }
> = {
  quarterly: {
    title: 'Quarterly Revenue Performance',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      { label: 'Revenue ($k)', data: [420, 580, 690, 840] },
      { label: 'Profit ($k)', data: [140, 210, 260, 350] },
    ],
  },
  monthly: {
    title: 'Monthly Website Visitors',
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{ label: 'Visitors (k)', data: [65, 84, 112, 98, 145, 178] }],
  },
  marketShare: {
    title: 'Market Share Distribution',
    labels: ['Product A', 'Product B', 'Product C', 'Product D', 'Others'],
    datasets: [{ label: 'Share (%)', data: [38, 26, 18, 12, 6] }],
  },
  departments: {
    title: 'Department Budget Allocation',
    labels: ['Engineering', 'Marketing', 'Operations', 'Sales', 'Support'],
    datasets: [{ label: 'Budget ($k)', data: [350, 180, 120, 240, 90] }],
  },
};

export const ChartGeneratorModal: React.FC<ChartGeneratorModalProps> = ({
  isOpen,
  onClose,
  editor,
  onNotify,
}) => {
  const [chartType, setChartType] = useState<ChartType>('column');
  const [targetWidth, setTargetWidth] = useState<ChartWidthOption>(900);
  const [chartTitle, setChartTitle] = useState('Data Analysis Chart');
  const [chartSubtitle, setChartSubtitle] = useState('');
  const [selectedPalette, setSelectedPalette] = useState<keyof typeof PALETTES>('vibrant');
  const [showValues, setShowValues] = useState(true);
  const [distinctColors, setDistinctColors] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [bgStyle, setBgStyle] = useState<'white' | 'card' | 'transparent'>('white');

  // Table Data State
  const [labels, setLabels] = useState<string[]>(['Q1', 'Q2', 'Q3', 'Q4']);
  const [datasets, setDatasets] = useState<ChartDataset[]>([
    { label: 'Series 1', data: [45, 78, 62, 95], color: PALETTES.vibrant[0] },
    { label: 'Series 2', data: [25, 48, 54, 70], color: PALETTES.vibrant[1] },
  ]);
  const [isFromSelectedTable, setIsFromSelectedTable] = useState(false);
  const [tableDimensions, setTableDimensions] = useState<{ rows: number; cols: number } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [exportUrl, setExportUrl] = useState<string>('');

  // Extract table values when modal opens
  useEffect(() => {
    if (!isOpen || !editor) return;

    let tableExtracted = false;
    try {
      const { state } = editor;
      const table = findTable(state.selection.$from);

      if (table && table.node) {
        const rawGrid: string[][] = [];
        table.node.forEach((rowNode) => {
          const rowVals: string[] = [];
          rowNode.forEach((cellNode) => {
            rowVals.push(cellNode.textContent.trim());
          });
          if (rowVals.length > 0) {
            rawGrid.push(rowVals);
          }
        });

        if (rawGrid.length >= 2 && rawGrid[0].length >= 2) {
          // Parse Header Row & Data Rows
          const colCount = rawGrid[0].length;
          const rowCount = rawGrid.length;

          // Check if first column has labels and columns 1..N have numbers
          const newLabels: string[] = [];
          const seriesData: { label: string; data: number[] }[] = [];

          // Initialize series for numeric columns (from column 1 to end)
          for (let c = 1; c < colCount; c++) {
            const seriesName = rawGrid[0][c] || `Series ${c}`;
            seriesData.push({ label: seriesName, data: [] });
          }

          for (let r = 1; r < rowCount; r++) {
            const rowLabel = rawGrid[r][0] || `Row ${r}`;
            newLabels.push(rowLabel);
            for (let c = 1; c < colCount; c++) {
              const rawStr = rawGrid[r][c] || '0';
              // Clean numeric strings: remove currency, commas, percent
              const cleaned = rawStr.replace(/[^0-9.-]/g, '');
              const num = parseFloat(cleaned);
              seriesData[c - 1].data.push(isNaN(num) ? 0 : num);
            }
          }

          if (newLabels.length > 0 && seriesData.length > 0 && seriesData[0].data.length > 0) {
            const colors = PALETTES[selectedPalette] || PALETTES.vibrant;
            setLabels(newLabels);
            setDatasets(
              seriesData.map((s, idx) => ({
                label: s.label,
                data: s.data,
                color: colors[idx % colors.length],
              }))
            );
            setChartTitle(rawGrid[0][0] && isNaN(Number(rawGrid[0][0])) ? `${rawGrid[0][0]} Overview` : 'Table Analysis');
            setIsFromSelectedTable(true);
            setTableDimensions({ rows: rowCount, cols: colCount });
            tableExtracted = true;
          }
        }
      }
    } catch {
      // Ignore parsing errors, fallback to default template
    }

    if (!tableExtracted) {
      setIsFromSelectedTable(false);
      setTableDimensions(null);
      // Load quarterly preset
      const t = SAMPLE_TEMPLATES.quarterly;
      setChartTitle(t.title);
      setLabels([...t.labels]);
      const colors = PALETTES[selectedPalette] || PALETTES.vibrant;
      setDatasets(
        t.datasets.map((d, i) => ({
          label: d.label,
          data: [...d.data],
          color: colors[i % colors.length],
        }))
      );
    }
  }, [isOpen, editor]);

  // Update dataset colors when palette changes
  useEffect(() => {
    const colors = PALETTES[selectedPalette] || PALETTES.vibrant;
    setDatasets((prev) =>
      prev.map((ds, idx) => ({
        ...ds,
        color: colors[idx % colors.length],
      }))
    );
  }, [selectedPalette]);

  // Canvas drawing routine
  const renderChartToCanvas = useCallback(
    (canvas: HTMLCanvasElement, exportWidth: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Aspect ratio: 16:10 for widescreen or 16:9
      const aspectRatio = chartType === 'pie' || chartType === 'doughnut' ? 1.4 : 1.7;
      const exportHeight = Math.round(exportWidth / aspectRatio);

      // Retina scale factor for ultra-sharp rendering
      const dpr = 2;
      canvas.width = exportWidth * dpr;
      canvas.height = exportHeight * dpr;

      ctx.save();
      ctx.scale(dpr, dpr);

      const width = exportWidth;
      const height = exportHeight;
      const isCompact = exportWidth <= 600;

      // 1. Background
      if (bgStyle === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      } else if (bgStyle === 'card') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
      } else {
        ctx.clearRect(0, 0, width, height);
      }

      // 2. Title & Subtitle
      const titleSize = isCompact ? 17 : exportWidth >= 1200 ? 26 : 22;
      const subTitleSize = isCompact ? 11 : 13;
      let topPadding = isCompact ? 28 : 40;
      if (chartTitle) {
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${titleSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(chartTitle, isCompact ? 24 : 36, topPadding);
        topPadding += isCompact ? 22 : 28;

        if (chartSubtitle) {
          ctx.fillStyle = '#64748b';
          ctx.font = `${subTitleSize}px system-ui, -apple-system, sans-serif`;
          ctx.fillText(chartSubtitle, isCompact ? 24 : 36, topPadding);
          topPadding += isCompact ? 16 : 20;
        } else {
          topPadding += isCompact ? 4 : 8;
        }
      }

      const bottomPadding = isCompact ? 36 : 48;
      const leftPadding = isCompact ? 48 : 64;
      const rightPadding =
        showLegend && (chartType === 'column' || chartType === 'line' || chartType === 'area')
          ? (isCompact ? 95 : 140)
          : (isCompact ? 20 : 40);

      const chartArea = {
        x: leftPadding,
        y: topPadding,
        width: Math.max(80, width - leftPadding - rightPadding),
        height: Math.max(80, height - topPadding - bottomPadding),
      };

      const colors = PALETTES[selectedPalette] || PALETTES.vibrant;

      // 3. Render per chart type
      if (chartType === 'pie' || chartType === 'doughnut') {
        // Pie / Doughnut uses first dataset
        const primaryData = datasets[0]?.data || [];
        const total = primaryData.reduce((acc, v) => acc + Math.max(0, v), 0) || 1;

        const centerX = width * 0.42;
        const centerY = topPadding + (height - topPadding) * 0.48;
        const radius = Math.min((width * 0.42) - 40, (height - topPadding) * 0.42);
        const innerRadius = chartType === 'doughnut' ? radius * 0.55 : 0;

        let currentAngle = -Math.PI / 2;

        primaryData.forEach((val, idx) => {
          const sliceAngle = (Math.max(0, val) / total) * (Math.PI * 2);
          const sliceColor = colors[idx % colors.length];

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
          if (innerRadius > 0) {
            ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
          } else {
            ctx.lineTo(centerX, centerY);
          }
          ctx.closePath();

          ctx.fillStyle = sliceColor;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Value percentage badge
          if (showValues && sliceAngle > 0.15) {
            const midAngle = currentAngle + sliceAngle / 2;
            const textRadius = innerRadius > 0 ? (radius + innerRadius) / 2 : radius * 0.65;
            const textX = centerX + Math.cos(midAngle) * textRadius;
            const textY = centerY + Math.sin(midAngle) * textRadius;
            const pct = Math.round((val / total) * 100);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 3;
            ctx.fillText(`${pct}%`, textX, textY);
            ctx.shadowBlur = 0;
          }

          currentAngle += sliceAngle;
        });

        // Doughnut center total summary
        if (chartType === 'doughnut') {
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 20px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(total.toLocaleString(), centerX, centerY - 6);
          ctx.fillStyle = '#64748b';
          ctx.font = '11px system-ui, sans-serif';
          ctx.fillText('TOTAL', centerX, centerY + 14);
        }

        // Legend on Right side
        if (showLegend) {
          const legendX = width * 0.72;
          let legendY = topPadding + 16;
          primaryData.forEach((val, idx) => {
            const label = labels[idx] || `Item ${idx + 1}`;
            const sliceColor = colors[idx % colors.length];
            const pct = Math.round((val / total) * 100);

            ctx.fillStyle = sliceColor;
            ctx.beginPath();
            ctx.roundRect(legendX, legendY, 12, 12, 3);
            ctx.fill();

            ctx.fillStyle = '#1e293b';
            ctx.font = '500 12px system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${label} (${pct}%)`, legendX + 20, legendY + 6);

            legendY += 24;
          });
        }
      } else if (chartType === 'bar') {
        // Horizontal Bar Chart
        const primaryData = datasets[0]?.data || [];
        const maxVal = Math.max(...primaryData, 1);
        const barHeight = Math.min(32, (chartArea.height / Math.max(1, primaryData.length)) * 0.65);
        const gap = chartArea.height / Math.max(1, primaryData.length);

        primaryData.forEach((val, idx) => {
          const barY = chartArea.y + idx * gap + (gap - barHeight) / 2;
          const barWidth = Math.max(2, (val / maxVal) * chartArea.width);
          const barColor = distinctColors ? colors[idx % colors.length] : (datasets[0]?.color || colors[0]);

          // Bar fill
          ctx.fillStyle = barColor;
          ctx.beginPath();
          ctx.roundRect(chartArea.x, barY, barWidth, barHeight, [0, 4, 4, 0]);
          ctx.fill();

          // Category Label on Left
          ctx.fillStyle = '#475569';
          ctx.font = '500 12px system-ui, sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(labels[idx] || '', chartArea.x - 12, barY + barHeight / 2);

          // Value Label on Right
          if (showValues) {
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(val.toLocaleString(), chartArea.x + barWidth + 8, barY + barHeight / 2);
          }
        });
      } else {
        // Column / Line / Area Charts
        // Calculate bounds
        let maxVal = -Infinity;
        let minVal = Infinity;
        datasets.forEach((ds) => {
          ds.data.forEach((v) => {
            if (v > maxVal) maxVal = v;
            if (v < minVal) minVal = v;
          });
        });

        if (minVal > 0) minVal = 0;
        if (maxVal === -Infinity) maxVal = 100;
        if (maxVal === minVal) maxVal += 10;

        // Round maxVal up to nice numbers
        const range = maxVal - minVal;
        const gridSteps = 5;
        const stepValue = Math.ceil(range / gridSteps / 10) * 10 || 10;
        const niceMax = minVal + stepValue * gridSteps;

        // Draw Y-Axis Gridlines & Values
        for (let i = 0; i <= gridSteps; i++) {
          const gridVal = minVal + i * stepValue;
          const y = chartArea.y + chartArea.height - (i / gridSteps) * chartArea.height;

          if (showGrid) {
            ctx.beginPath();
            ctx.strokeStyle = i === 0 ? '#94a3b8' : '#e2e8f0';
            ctx.lineWidth = i === 0 ? 1.5 : 1;
            ctx.setLineDash(i === 0 ? [] : [4, 4]);
            ctx.moveTo(chartArea.x, y);
            ctx.lineTo(chartArea.x + chartArea.width, y);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          ctx.fillStyle = '#64748b';
          ctx.font = '11px system-ui, sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(gridVal.toLocaleString(), chartArea.x - 10, y);
        }

        // Draw Category X-Axis Labels
        const colWidth = chartArea.width / Math.max(1, labels.length);
        labels.forEach((lbl, idx) => {
          const x = chartArea.x + idx * colWidth + colWidth / 2;
          ctx.fillStyle = '#475569';
          ctx.font = '500 12px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(lbl, x, chartArea.y + chartArea.height + 10);
        });

        // Draw Series Data
        if (chartType === 'column') {
          const seriesCount = datasets.length;
          const groupPadding = colWidth * 0.18;
          const availWidth = colWidth - groupPadding * 2;
          const barWidth = Math.min(48, availWidth / seriesCount);

          labels.forEach((_, labelIdx) => {
            datasets.forEach((ds, dsIdx) => {
              const val = ds.data[labelIdx] || 0;
              const barHeight = Math.max(2, ((val - minVal) / (niceMax - minVal)) * chartArea.height);
              const groupStartX = chartArea.x + labelIdx * colWidth + (colWidth - seriesCount * barWidth) / 2;
              const barX = groupStartX + dsIdx * barWidth;
              const barY = chartArea.y + chartArea.height - barHeight;

              // If single series and distinctColors is true, color each column bar uniquely by palette!
              const barColor =
                seriesCount === 1 && distinctColors
                  ? colors[labelIdx % colors.length]
                  : ds.color;

              ctx.fillStyle = barColor;
              ctx.beginPath();
              ctx.roundRect(barX, barY, Math.max(2, barWidth - 3), barHeight, [4, 4, 0, 0]);
              ctx.fill();

              // Values on top of columns
              if (showValues && barHeight > 10) {
                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 10px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(val.toLocaleString(), barX + barWidth / 2 - 1.5, barY - 4);
              }
            });
          });
        } else if (chartType === 'line' || chartType === 'area') {
          datasets.forEach((ds) => {
            const points: { x: number; y: number; val: number }[] = [];
            labels.forEach((_, idx) => {
              const val = ds.data[idx] || 0;
              const x = chartArea.x + idx * colWidth + colWidth / 2;
              const y = chartArea.y + chartArea.height - ((val - minVal) / (niceMax - minVal)) * chartArea.height;
              points.push({ x, y, val });
            });

            // Draw Area Fill if selected
            if (chartType === 'area' && points.length > 0) {
              ctx.beginPath();
              ctx.moveTo(points[0].x, chartArea.y + chartArea.height);
              points.forEach((p) => ctx.lineTo(p.x, p.y));
              ctx.lineTo(points[points.length - 1].x, chartArea.y + chartArea.height);
              ctx.closePath();

              const grad = ctx.createLinearGradient(0, chartArea.y, 0, chartArea.y + chartArea.height);
              grad.addColorStop(0, `${ds.color}55`); // 33% opacity
              grad.addColorStop(1, `${ds.color}05`); // 2% opacity
              ctx.fillStyle = grad;
              ctx.fill();
            }

            // Draw Line
            ctx.beginPath();
            ctx.strokeStyle = ds.color;
            ctx.lineWidth = 3.5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            points.forEach((p, idx) => {
              if (idx === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();

            // Draw Dots & Values
            points.forEach((p, idx) => {
              const dotColor =
                datasets.length === 1 && distinctColors
                  ? colors[idx % colors.length]
                  : ds.color;

              ctx.beginPath();
              ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.fill();
              ctx.strokeStyle = dotColor;
              ctx.lineWidth = 3;
              ctx.stroke();

              if (showValues) {
                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 11px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(p.val.toLocaleString(), p.x, p.y - 8);
              }
            });
          });
        }

        // Legend for Column / Line / Area
        if (showLegend) {
          const isSingleSeries =
            (chartType === 'column' || chartType === 'line' || chartType === 'area') &&
            datasets.length === 1;
          const legendX = width - rightPadding + 16;
          let legendY = topPadding;

          if (isSingleSeries && distinctColors) {
            // Show distinct category swatches in the legend
            labels.forEach((lbl, idx) => {
              const itemColor = colors[idx % colors.length];
              ctx.fillStyle = itemColor;
              ctx.beginPath();
              ctx.roundRect(legendX, legendY, 12, 12, 3);
              ctx.fill();

              ctx.fillStyle = '#334155';
              ctx.font = '500 11px system-ui, sans-serif';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillText(lbl, legendX + 18, legendY + 6);

              legendY += 22;
            });
          } else if (datasets.length > 0) {
            datasets.forEach((ds) => {
              ctx.fillStyle = ds.color;
              ctx.beginPath();
              ctx.roundRect(legendX, legendY, 12, 12, 3);
              ctx.fill();

              ctx.fillStyle = '#334155';
              ctx.font = '500 11px system-ui, sans-serif';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillText(ds.label, legendX + 18, legendY + 6);

              legendY += 22;
            });
          }
        }
      }

      ctx.restore();
    },
    [
      chartType,
      chartTitle,
      chartSubtitle,
      selectedPalette,
      showValues,
      distinctColors,
      showGrid,
      showLegend,
      bgStyle,
      labels,
      datasets,
    ]
  );

  // Live Canvas Preview update
  useEffect(() => {
    if (!previewCanvasRef.current || !isOpen) return;
    renderChartToCanvas(previewCanvasRef.current, targetWidth);

    try {
      const url = previewCanvasRef.current.toDataURL('image/webp', 0.94);
      setExportUrl(url);
    } catch {
      // Fallback
      if (previewCanvasRef.current) {
        setExportUrl(previewCanvasRef.current.toDataURL('image/png'));
      }
    }
  }, [renderChartToCanvas, targetWidth, isOpen]);

  // Handle Insert into TipTap Document
  const handleInsertIntoDocument = () => {
    if (!editor || !previewCanvasRef.current) return;

    // Render offscreen canvas at exact target resolution
    const offscreen = document.createElement('canvas');
    renderChartToCanvas(offscreen, targetWidth);

    let finalDataUrl = '';
    try {
      finalDataUrl = offscreen.toDataURL('image/webp', 0.94);
    } catch {
      finalDataUrl = offscreen.toDataURL('image/png');
    }

    if (finalDataUrl) {
      editor
        .chain()
        .focus()
        .setImage({
          src: finalDataUrl,
          alt: chartTitle || 'Chart',
        })
        .run();

      onNotify?.(`Inserted ${chartType.toUpperCase()} chart (${targetWidth}px WebP) into document.`);
      onClose();
    }
  };

  // Download WebP locally
  const handleDownloadWebp = () => {
    if (!exportUrl) return;
    const a = document.createElement('a');
    a.href = exportUrl;
    a.download = `${(chartTitle || 'chart').toLowerCase().replace(/\s+/g, '-')}-${targetWidth}px.webp`;
    a.click();
    onNotify?.('Chart exported as WebP file.');
  };

  // Data table helpers
  const handleUpdateLabel = (idx: number, newVal: string) => {
    setLabels((prev) => {
      const copy = [...prev];
      copy[idx] = newVal;
      return copy;
    });
  };

  const handleUpdateValue = (dsIdx: number, valIdx: number, newVal: string) => {
    const num = parseFloat(newVal);
    setDatasets((prev) => {
      const copy = [...prev];
      const dataCopy = [...copy[dsIdx].data];
      dataCopy[valIdx] = isNaN(num) ? 0 : num;
      copy[dsIdx] = { ...copy[dsIdx], data: dataCopy };
      return copy;
    });
  };

  const handleAddRow = () => {
    setLabels((prev) => [...prev, `Item ${prev.length + 1}`]);
    setDatasets((prev) =>
      prev.map((ds) => ({
        ...ds,
        data: [...ds.data, Math.round(Math.random() * 80 + 20)],
      }))
    );
  };

  const handleRemoveRow = (idx: number) => {
    if (labels.length <= 1) return;
    setLabels((prev) => prev.filter((_, i) => i !== idx));
    setDatasets((prev) =>
      prev.map((ds) => ({
        ...ds,
        data: ds.data.filter((_, i) => i !== idx),
      }))
    );
  };

  const handleTranspose = () => {
    if (datasets.length === 0 || labels.length === 0) return;
    // Swap rows & columns
    const newLabels = datasets.map((d) => d.label);
    const newDatasets: ChartDataset[] = labels.map((l, lIdx) => {
      const colors = PALETTES[selectedPalette] || PALETTES.vibrant;
      return {
        label: l,
        data: datasets.map((d) => d.data[lIdx] || 0),
        color: colors[lIdx % colors.length],
      };
    });
    setLabels(newLabels);
    setDatasets(newDatasets);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-3 sm:p-5 select-none animate-in fade-in duration-150"
      data-word-modal="true"
      style={{ zIndex: 99999 }}
    >
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <BarChart3 size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Insert Chart from Table Data
                </h2>
                {isFromSelectedTable ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    <TableIcon size={11} />
                    <span>Selected Table Data Linked</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Standalone Generator
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Generates a crisp WebP image and inserts directly into your document with zero background CPU/memory usage.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 rounded-lg transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body: Two columns (Config on left, Preview on right) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200 dark:divide-neutral-700">
          {/* LEFT COLUMN: Controls & Data Grid (5 cols) */}
          <div className="lg:col-span-5 p-5 space-y-4 overflow-y-auto max-h-[72vh]">
            {/* Chart Type Picker */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Chart Type
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { id: 'column', label: 'Column', icon: BarChart3 },
                  { id: 'bar', label: 'Bar', icon: ArrowUpDown },
                  { id: 'line', label: 'Line', icon: LineChart },
                  { id: 'area', label: 'Area', icon: TrendingUp },
                  { id: 'pie', label: 'Pie', icon: PieChart },
                  { id: 'doughnut', label: 'Ring', icon: CircleDot },
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = chartType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setChartType(type.id as ChartType)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-400 shadow-2xs'
                          : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <Icon size={18} className="mb-1" />
                      <span className="text-[11px] leading-tight">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Width Resolution */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Export Width (WebP)
                </label>
                <span className="text-[11px] text-neutral-400">Target document size</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { width: 600, label: '600 px', desc: 'Compact / Half' },
                  { width: 800, label: '800 px', desc: 'Standard Page' },
                  { width: 900, label: '900 px', desc: 'Optimal Fit' },
                  { width: 1200, label: '1200 px', desc: 'Ultra-HD' },
                ].map((opt) => (
                  <button
                    key={opt.width}
                    onClick={() => setTargetWidth(opt.width as ChartWidthOption)}
                    className={`py-2 px-2 rounded-lg border text-center cursor-pointer transition-all ${
                      targetWidth === opt.width
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-400 font-bold shadow-2xs'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium'
                    }`}
                  >
                    <div className="text-xs">{opt.label}</div>
                    <div className="text-[10px] text-neutral-400 font-normal leading-tight">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Title */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Chart Title
              </label>
              <input
                type="text"
                value={chartTitle}
                onChange={(e) => setChartTitle(e.target.value)}
                placeholder="e.g. Sales Q1-Q4"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Color Palette Selector with Live Color Chips */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center space-x-1.5">
                  <Palette size={13} className="text-blue-600 dark:text-blue-400" />
                  <span>Color Palette</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const keys = Object.keys(PALETTES);
                    const idx = keys.indexOf(selectedPalette);
                    const nextKey = keys[(idx + 1) % keys.length];
                    setSelectedPalette(nextKey);
                  }}
                  className="inline-flex items-center space-x-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  title="Cycle to next palette"
                >
                  <Shuffle size={11} />
                  <span>Try Next Palette</span>
                </button>
              </div>

              {/* Grid of clickable palette cards showing live color dots */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {Object.entries(PALETTES).map(([key, swatches]) => {
                  const isSelected = selectedPalette === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedPalette(key)}
                      className={`flex flex-col items-start p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-500 ring-1 ring-blue-500 shadow-2xs'
                          : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/80'
                      }`}
                    >
                      <div className="text-[11px] font-medium leading-tight truncate w-full text-neutral-800 dark:text-neutral-200 mb-1">
                        {PALETTE_LABELS[key] || key}
                      </div>
                      <div className="flex items-center space-x-1 w-full overflow-hidden">
                        {swatches.slice(0, 5).map((color, cIdx) => (
                          <span
                            key={cIdx}
                            className="w-3 h-3 rounded-full shrink-0 shadow-2xs border border-black/10 dark:border-white/20"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Options Toggles */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs">
              <label className="flex items-center space-x-1.5 cursor-pointer text-neutral-800 dark:text-neutral-200 font-medium">
                <input
                  type="checkbox"
                  checked={distinctColors}
                  onChange={(e) => setDistinctColors(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="flex items-center space-x-1">
                  <Sparkles size={12} className="text-amber-500" />
                  <span>Multi-Color Bars / Items</span>
                </span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={showValues}
                  onChange={(e) => setShowValues(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Value Badges</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Gridlines</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Legend</span>
              </label>
            </div>

            {/* Interactive Data Table Editor */}
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 bg-neutral-50/50 dark:bg-neutral-800/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center space-x-1.5">
                  <TableIcon size={13} className="text-blue-600" />
                  <span>Data Grid</span>
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={handleTranspose}
                    title="Transpose Rows and Columns"
                    className="p-1 text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-neutral-700 rounded text-xs transition-colors cursor-pointer flex items-center space-x-1 px-1.5"
                  >
                    <ArrowUpDown size={11} />
                    <span className="text-[10px]">Swap</span>
                  </button>
                  <button
                    onClick={handleAddRow}
                    className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded text-xs transition-colors cursor-pointer flex items-center space-x-1 px-1.5 font-semibold"
                  >
                    <Plus size={12} />
                    <span className="text-[10px]">Add Row</span>
                  </button>
                </div>
              </div>

              {/* Table Editor */}
              <div className="overflow-x-auto max-h-40 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 sticky top-0">
                    <tr>
                      <th className="p-1.5 px-2 font-medium text-[11px]">Category</th>
                      {datasets.map((ds, dsIdx) => (
                        <th key={dsIdx} className="p-1.5 px-2 font-medium text-[11px]">
                          {ds.label}
                        </th>
                      ))}
                      <th className="p-1.5 px-1 w-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {labels.map((lbl, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                        <td className="p-1 px-2">
                          <input
                            type="text"
                            value={lbl}
                            onChange={(e) => handleUpdateLabel(idx, e.target.value)}
                            className="w-full text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-neutral-300 focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-800 bg-transparent text-neutral-800 dark:text-neutral-200 outline-none"
                          />
                        </td>
                        {datasets.map((ds, dsIdx) => (
                          <td key={dsIdx} className="p-1 px-2">
                            <input
                              type="number"
                              value={ds.data[idx] ?? 0}
                              onChange={(e) => handleUpdateValue(dsIdx, idx, e.target.value)}
                              className="w-20 text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-neutral-300 focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-800 bg-transparent text-neutral-800 dark:text-neutral-200 outline-none text-right font-mono"
                            />
                          </td>
                        ))}
                        <td className="p-1 text-center">
                          {labels.length > 1 && (
                            <button
                              onClick={() => handleRemoveRow(idx)}
                              className="text-neutral-400 hover:text-rose-600 cursor-pointer p-0.5"
                              title="Delete row"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Sample Templates Pills (if not from table) */}
              {!isFromSelectedTable && (
                <div className="flex items-center space-x-1.5 pt-1 overflow-x-auto">
                  <span className="text-[10px] text-neutral-400 shrink-0">Templates:</span>
                  {Object.entries(SAMPLE_TEMPLATES).map(([key, tpl]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setChartTitle(tpl.title);
                        setLabels([...tpl.labels]);
                        const colors = PALETTES[selectedPalette] || PALETTES.vibrant;
                        setDatasets(
                          tpl.datasets.map((d, i) => ({
                            label: d.label,
                            data: [...d.data],
                            color: colors[i % colors.length],
                          }))
                        );
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer shrink-0 font-medium"
                    >
                      {tpl.title.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Live Render Preview (7 cols) */}
          <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-neutral-100/50 dark:bg-neutral-900/40">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Live WebP Preview
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium">
                    {targetWidth} &times; {Math.round(targetWidth / (chartType === 'pie' || chartType === 'doughnut' ? 1.4 : 1.7))} px
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDownloadWebp}
                    title="Download as WebP file"
                    className="flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Canvas Preview Container */}
              <div className="relative border border-neutral-300 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-black shadow-inner flex items-center justify-center p-2 min-h-[300px]">
                <canvas
                  ref={previewCanvasRef}
                  className="max-w-full max-h-[380px] object-contain rounded shadow-sm"
                  style={{ imageRendering: 'auto' }}
                />
              </div>

              <div className="flex items-center justify-between mt-3 text-[11px] text-neutral-500 dark:text-neutral-400">
                <span>&bull; Static WebP export &bull; Instant render</span>
                <span>Ready to insert into document canvas</span>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-end space-x-3 pt-5 mt-4 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertIntoDocument}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all transform active:scale-98 cursor-pointer"
              >
                <Check size={16} />
                <span>Insert Chart into Document</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ChartGeneratorModal;
