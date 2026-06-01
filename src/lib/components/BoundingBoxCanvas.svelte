<script>
  import { onMount } from 'svelte';

  export let imageUrl = '';
  export let measurements = null;
  export let status = 'OK';
  export let deviations = {};

  let canvas;
  let ctx;
  let img;

  const colors = {
    OK: '#32C864',
    NG: '#E74C3C',
    'NO GOOD': '#E74C3C',
    'NO REF': '#F39C12',
    cyan: '#00D4FF',
    yellow: '#FFD700',
    purple: '#C850C8',
    teal: '#78DCB4'
  };

  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d');
      loadImage();
    }
  });

  function loadImage() {
    if (!imageUrl || !measurements) return;

    img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      drawAnnotations();
    };
    img.src = imageUrl;
  }

  function drawAnnotations() {
    if (!ctx || !img || !measurements) return;

    // Draw image
    ctx.drawImage(img, 0, 0);

    const statusColor = colors[status] || colors.OK;

    // Draw contour
    if (measurements.contour && measurements.contour.length > 0) {
      ctx.strokeStyle = colors.teal;
      ctx.lineWidth = 1;
      ctx.beginPath();
      measurements.contour.forEach((point, i) => {
        const [x, y] = point[0];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }

    // Draw bounding box based on shape
    if (measurements.shape === 'circle') {
      drawCircle(statusColor);
    } else {
      drawRotatedBox(statusColor);
    }

    // Draw labels
    drawLabels(statusColor);
  }

  function drawCircle(color) {
    const [cx, cy] = measurements.center;
    const r = measurements.radius_px;

    // Draw circle
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw diameter line
    drawDimensionLine(
      [cx - r, cy],
      [cx + r, cy],
      measurements.diameter_mm,
      colors.yellow,
      28
    );
  }

  function drawRotatedBox(color) {
    if (!measurements.rot_box || measurements.rot_box.length < 4) return;

    // Draw rotated rectangle
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    measurements.rot_box.forEach((point, i) => {
      const [x, y] = point;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    // Calculate which sides are width and height
    const box = measurements.rot_box;
    const sa = distance(box[0], box[1]);
    const sb = distance(box[1], box[2]);

    let lp1, lp2, sp1, sp2;
    if (sa >= sb) {
      lp1 = box[0]; lp2 = box[1];
      sp1 = box[1]; sp2 = box[2];
    } else {
      lp1 = box[1]; lp2 = box[2];
      sp1 = box[0]; sp2 = box[1];
    }

    // Draw dimension lines
    drawDimensionLine(lp1, lp2, measurements.width_mm, colors.yellow, 28);
    drawDimensionLine(sp1, sp2, measurements.height_mm, colors.purple, 28);
  }

  function drawDimensionLine(p1, p2, valueMm, color, offset) {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);

    if (length < 2) return;

    // Calculate perpendicular offset
    const nx = (-dy / length) * offset;
    const ny = (dx / length) * offset;

    const op1 = [x1 + nx, y1 + ny];
    const op2 = [x2 + nx, y2 + ny];

    // Draw perpendicular lines
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(op1[0], op1[1]);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(op2[0], op2[1]);
    ctx.stroke();

    // Draw arrow line
    drawArrowLine(op1, op2, color);

    // Draw dimension text
    const mid = [(op1[0] + op2[0]) / 2, (op1[1] + op2[1]) / 2];
    drawLabel(`${valueMm.toFixed(1)}mm`, [mid[0] - 18, mid[1] - 5], 0.44, color, '#121212');
  }

  function drawArrowLine(p1, p2, color) {
    const [x1, y1] = p1;
    const [x2, y2] = p2;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Draw arrow heads
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    if (length === 0) return;

    const nx = (-dy / length) * 6;
    const ny = (dx / length) * 6;

    [p1, p2].forEach(([px, py]) => {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - nx, py - ny);
      ctx.lineTo(px + nx, py + ny);
      ctx.stroke();
    });
  }

  function drawLabels(color) {
    if (!measurements.bbox) return;

    const [x, y, w, h] = measurements.bbox;
    const shapeLabel = {
      circle: 'CIRCLE',
      rectangle: 'RECT',
      triangle: 'TRI',
      pentagon: 'PENT',
      hexagon: 'HEX',
      octagon: 'OCT'
    }[measurements.shape] || measurements.shape.toUpperCase();

    let sizeLabel = '';
    if (measurements.shape === 'circle') {
      sizeLabel = `Ø${measurements.diameter_mm.toFixed(2)}mm`;
    } else {
      sizeLabel = `${measurements.width_mm.toFixed(2)}×${measurements.height_mm.toFixed(2)}mm`;
    }

    const topY = measurements.shape === 'circle' 
      ? measurements.center[1] - measurements.radius_px - 14
      : y - 14;

    // Draw shape and size label
    drawLabel(`#1 ${shapeLabel}  ${sizeLabel}`, [x, topY], 0.48, color, '#141414');

    // Draw status label
    drawLabel(status, [x, topY - 20], 0.52, color, '#141414', 2);
  }

  function drawLabel(text, pos, scale, color, bg = null, thick = 1) {
    const fontSize = 14 * scale;
    ctx.font = `${thick > 1 ? 'bold' : 'normal'} ${fontSize}px Arial`;
    
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    const [x, y] = pos;
    const pad = 5;

    // Draw background
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(x - pad, y - textHeight - pad, textWidth + pad * 2, textHeight + pad * 2);
    }

    // Draw text
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function distance(p1, p2) {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    return Math.hypot(x2 - x1, y2 - y1);
  }

  $: if (imageUrl && measurements && canvas) {
    loadImage();
  }
</script>

<div class="canvas-container">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .canvas-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--clr-surface-2);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  canvas {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
</style>
