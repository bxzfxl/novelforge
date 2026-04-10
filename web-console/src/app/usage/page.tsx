'use client';

import OverviewCards from '@/components/usage/overview-cards';
import BudgetBar from '@/components/usage/budget-bar';
import OperationBreakdown from '@/components/usage/operation-breakdown';
import TimeSeriesChart from '@/components/usage/time-series-chart';
import SnapshotsTable from '@/components/usage/snapshots-table';
import PerOpEstimate from '@/components/usage/per-op-estimate';

export default function UsagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-800">用量监控</h2>
        <p className="mt-1 text-sm text-stone-500">AI 调用成本、按操作拆分、失败快照</p>
      </div>

      <OverviewCards />
      <BudgetBar />
      <OperationBreakdown />
      <TimeSeriesChart />
      <PerOpEstimate />
      <SnapshotsTable />
    </div>
  );
}
