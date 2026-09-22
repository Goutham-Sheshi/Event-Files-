import React from 'react'

export function ResourceCardSkeleton() {
  return (
    <div className="bg-[var(--paper)] border border-[var(--border-1)] rounded-2xl overflow-hidden animate-pulse flex flex-col h-full">
      <div className="h-44 bg-[var(--surface-1)] relative" />
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-[var(--surface-2)] rounded-md w-4/5" />
          <div className="h-3.5 bg-[var(--surface-1)] rounded-md w-3/5" />
        </div>
        <div className="flex gap-2">
          <div className="h-3 bg-[var(--surface-2)] rounded-full w-14" />
          <div className="h-3 bg-[var(--surface-1)] rounded-full w-10" />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-[var(--border-1)]">
          <div className="h-3 bg-[var(--surface-1)] rounded-md w-16" />
          <div className="h-3 bg-[var(--surface-2)] rounded-md w-12" />
        </div>
      </div>
    </div>
  )
}

export function ResourceGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ResourceCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function EventCardSkeleton() {
  return (
    <div className="bg-[var(--paper)] border border-[var(--border-1)] rounded-2xl overflow-hidden animate-pulse h-full flex flex-col">
      <div className="h-40 bg-[var(--surface-1)]" />
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-3 bg-[var(--surface-2)] rounded-full w-16" />
          <div className="h-4 bg-[var(--surface-2)] rounded-md w-3/4" />
        </div>
        <div className="h-3 bg-[var(--surface-1)] rounded-md w-1/2" />
      </div>
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse border-b border-[var(--border-1)]">
      <td className="px-4 py-3.5"><div className="h-4 bg-[var(--surface-2)] rounded-md w-48" /></td>
      <td className="px-4 py-3.5"><div className="h-3 bg-[var(--surface-1)] rounded-md w-12" /></td>
      <td className="px-4 py-3.5"><div className="h-3 bg-[var(--surface-2)] rounded-md w-24" /></td>
      <td className="px-4 py-3.5"><div className="h-3 bg-[var(--surface-1)] rounded-md w-16" /></td>
      <td className="px-4 py-3.5 text-right"><div className="h-3 bg-[var(--surface-2)] rounded-md w-14 ml-auto" /></td>
    </tr>
  )
}
