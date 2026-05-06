<script>
  import { t } from '$lib/i18n.js';
  import { mockVendorNg } from '$lib/data/mock.js';

  let vendors = $state([...mockVendorNg]);

  const failedDimensions = [
    { dimension: 'Lebar (Width)', count: 15, pct: 45 },
    { dimension: 'Diameter', count: 12, pct: 36 },
    { dimension: 'Panjang (Length)', count: 6, pct: 19 },
  ];

  const problemParts = [
    { part: 'BOLT-B12', ngCount: 10, totalInspected: 200, rate: 5.0 },
    { part: 'SHAFT-C05', ngCount: 3, totalInspected: 100, rate: 3.0 },
    { part: 'GEAR-A01', ngCount: 5, totalInspected: 350, rate: 1.4 },
  ];
</script>

<svelte:head><title>{$t('manager.defect_title')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <h1 class="page-title">{$t('manager.defect_title')}</h1>

  <div class="defect-grid">
    <!-- Vendor NG -->
    <div class="card">
      <h3 class="card-title">{$t('manager.top_ng_vendors')}</h3>
      {#each vendors as vendor, i}
        <div class="defect-row">
          <span class="rank" class:top={i === 0}>#{i + 1}</span>
          <span class="name">{vendor.name}</span>
          <div class="bar-bg"><div class="bar-fill" style="width: {(vendor.rate / 5) * 100}%"></div></div>
          <span class="rate">{vendor.rate}%</span>
        </div>
      {/each}
    </div>

    <!-- Failed Dimensions -->
    <div class="card">
      <h3 class="card-title">{$t('manager.failed_dimension')}</h3>
      {#each failedDimensions as dim}
        <div class="defect-row">
          <span class="name">{dim.dimension}</span>
          <div class="bar-bg"><div class="bar-fill accent" style="width: {dim.pct}%"></div></div>
          <span class="rate">{dim.count}x ({dim.pct}%)</span>
        </div>
      {/each}
    </div>

    <!-- Problem Parts -->
    <div class="card full-width">
      <h3 class="card-title">{$t('manager.problem_parts')}</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>Part</th><th>NG Count</th><th>Total Inspected</th><th>NG Rate</th></tr>
          </thead>
          <tbody>
            {#each problemParts as part}
              <tr>
                <td><strong>{part.part}</strong></td>
                <td><span class="badge badge-ng">{part.ngCount}</span></td>
                <td>{part.totalInspected}</td>
                <td class="rate-cell">{part.rate}%</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<style>
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); margin-bottom: var(--sp-5); }
  .defect-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); }
  .full-width { grid-column: 1 / -1; }
  .card-title { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--clr-text-muted); margin-bottom: var(--sp-4); text-transform: uppercase; letter-spacing: 0.5px; }
  .defect-row { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3); }
  .rank { font-size: var(--fs-xs); color: var(--clr-text-dim); font-weight: var(--fw-bold); min-width: 24px; }
  .rank.top { color: var(--clr-ng); }
  .name { font-size: var(--fs-sm); min-width: 100px; }
  .bar-bg { flex: 1; height: 8px; background: var(--clr-surface-2); border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, var(--clr-ng), #f87171); border-radius: 4px; transition: width 0.6s ease; }
  .bar-fill.accent { background: linear-gradient(90deg, var(--clr-accent), #818cf8); }
  .rate { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--clr-ng); min-width: 60px; text-align: right; }
  .rate-cell { color: var(--clr-ng); font-weight: var(--fw-semibold); }
</style>
