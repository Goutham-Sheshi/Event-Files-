import React from 'react'

export function ResourceCardSkeleton() {
  return (
    <div className="bg-[var(--paper)] border border-[var(--line-soft)] rounded-xl overflow-hidden animate-pulse flex flex-col h-full">
      <div className="h-40 bg-[var(--canvas-deep)] relative" />
      <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-[var(--line-soft)] rounded-md w-4/5" />
          <div className="h-4 bg-[var(--line-soft)] rounded-md w-3/5" />
        </div>
        <div className="flex gap-2">
          <div className="h-3 bg-[var(--line-soft)] rounded-full w-14" />
          <div className="h-3 bg-[var(--line-soft)] rounded-full w-10" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <div className="h-3 bg-[var(--line-soft)] rounded-md w-16" />
          <div className="h-3 bg-[var(--line-soft)] rounded-md w-12" />
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
    <div className="bg-[var(--paper)] border border-[var(--line-soft)] rounded-xl overflow-hidden animate-pulse h-full flex flex-col">
      <div className="h-36 bg-[var(--canvas-deep)]" />
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-3 bg-[var(--line-soft)] rounded-full w-16" />
          <div className="h-4 bg-[var(--line-soft)] rounded-md w-3/4" />
        </div>
        <div className="h-3 bg-[var(--line-soft)] rounded-md w-1/2" />
      </div>
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse border-b border-[var(--line-soft)]">
      <td className="px-4 py-3"><div className="h-4 bg-[var(--line-soft)] rounded-md w-48" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-[var(--line-soft)] rounded-md w-12" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-[var(--line-soft)] rounded-md w-24" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-[var(--line-soft)] rounded-md w-16" /></td>
      <td className="px-4 py-3 text-right"><div className="h-3 bg-[var(--line-soft)] rounded-md w-14 ml-auto" /></td>
    </tr>
  )
}
