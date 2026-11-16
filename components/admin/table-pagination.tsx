'use client'

import React from 'react'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

interface TablePaginationProps {
  page?: number
  totalPages?: number
  total?: number
  totalItems?: number
  limit?: number
  onPageChange: (newPage: number) => void
  disabled?: boolean
  className?: string
}

export function TablePagination({
  page: rawPage = 1,
  totalPages: rawTotalPages = 1,
  total: rawTotal,
  totalItems: rawTotalItems,
  limit: rawLimit = 10,
  onPageChange,
  disabled = false,
  className,
}: TablePaginationProps) {
  const page = Math.max(1, Number(rawPage) || 1)
  const totalPages = Math.max(1, Number(rawTotalPages) || 1)
  const total = Math.max(0, Number(rawTotal ?? rawTotalItems ?? 0) || 0)
  const limit = Math.max(1, Number(rawLimit) || 10)

  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = total === 0 ? 0 : Math.min(page * limit, total)

  // Generate pagination items with ellipses if necessary
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, 'ellipsis', totalPages)
      } else if (page >= totalPages - 2) {
        pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages)
      }
    }
    return pages
  }

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-1 text-sm', className)}>
      <div className="text-muted-foreground text-xs sm:text-sm">
        {total === 0 ? (
          'Tidak ada data'
        ) : (
          <>
            Menampilkan <span className="font-medium text-foreground">{start}</span> -{' '}
            <span className="font-medium text-foreground">{end}</span> dari{' '}
            <span className="font-medium text-foreground">{total}</span> data
          </>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            {/* PREVIOUS */}
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (!disabled && page > 1) onPageChange(page - 1)
                }}
                className={cn(
                  'cursor-pointer select-none text-xs sm:text-sm',
                  (disabled || page <= 1) && 'pointer-events-none opacity-40'
                )}
              />
            </PaginationItem>

            {/* PAGE NUMBERS */}
            {getPageNumbers().map((p, idx) => {
              if (p === 'ellipsis') {
                return (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                )
              }

              const isCurrent = p === page
              return (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={isCurrent}
                    onClick={(e) => {
                      e.preventDefault()
                      if (!disabled && !isCurrent) onPageChange(p)
                    }}
                    className={cn(
                      'cursor-pointer select-none text-xs sm:text-sm h-8 w-8 sm:h-9 sm:w-9',
                      isCurrent && 'bg-navy text-white hover:bg-navy-light hover:text-white border-navy',
                      disabled && 'pointer-events-none opacity-50'
                    )}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            })}

            {/* NEXT */}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (!disabled && page < totalPages) onPageChange(page + 1)
                }}
                className={cn(
                  'cursor-pointer select-none text-xs sm:text-sm',
                  (disabled || page >= totalPages) && 'pointer-events-none opacity-40'
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
