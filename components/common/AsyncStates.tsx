'use client';

import type { ReactNode } from 'react';
import { AlertCircle, Inbox } from 'lucide-react';

type TableRowStateProps = {
  columns: number;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function TableSkeletonRows({ columns, rowCount = 4 }: { columns: number; rowCount?: number }) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={`skeleton-row-${rowIndex}`} className="animate-pulse">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <td key={`skeleton-cell-${rowIndex}-${colIndex}`} className="px-6 py-4">
              <div className="h-4 w-full max-w-[180px] rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function TableStateRow({ columns, title, description, action }: TableRowStateProps) {
  return (
    <tr>
      <td colSpan={columns} className="px-6 py-10">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {description ? <p className="text-sm text-gray-500">{description}</p> : null}
          {action ? <div className="pt-1">{action}</div> : null}
        </div>
      </td>
    </tr>
  );
}

export function TableErrorRow({
  columns,
  title,
  description,
  onRetry,
  retryLabel,
}: {
  columns: number;
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <TableStateRow
      columns={columns}
      title={title}
      description={description}
      action={
        onRetry && retryLabel ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            {retryLabel}
          </button>
        ) : undefined
      }
    />
  );
}

export function TableEmptyRow({ columns, title, description }: Omit<TableRowStateProps, 'action'>) {
  return <TableStateRow columns={columns} title={title} description={description} />;
}

export function PanelErrorState({
  title,
  description,
  retryLabel,
  onRetry,
}: {
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-red-800">{title}</p>
          {description ? <p className="text-sm text-red-700">{description}</p> : null}
        </div>
        {onRetry && retryLabel ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            {retryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PanelEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3">
        <Inbox className="h-8 w-8 text-gray-400" />
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        {description ? <p className="text-sm text-gray-500">{description}</p> : null}
      </div>
    </div>
  );
}

export function PanelLoadingState({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-10">
      <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        {title}
      </div>
    </div>
  );
}
