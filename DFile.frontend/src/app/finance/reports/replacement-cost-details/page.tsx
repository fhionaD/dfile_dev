'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useReplacementProcurementDetails } from '@/hooks/use-finance-reports';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 10;

export default function ReplacementCostDetailsPage() {
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const { data: allDetails = [], isLoading } = useReplacementProcurementDetails();

    // Filter and paginate
    const filtered = useMemo(() => {
        if (!searchTerm.trim()) return allDetails;

        const term = searchTerm.toLowerCase();
        return allDetails.filter(
            detail =>
                detail.assetName?.toLowerCase().includes(term) ||
                detail.assetCode?.toLowerCase().includes(term) ||
                detail.requestId?.toLowerCase().includes(term) ||
                detail.approvedBy?.toLowerCase().includes(term)
        );
    }, [allDetails, searchTerm]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const paginatedData = filtered.slice(startIdx, startIdx + PAGE_SIZE);

    // Calculate totals
    const totalCost = useMemo(
        () => filtered.reduce((sum, d) => sum + (d.replacementCost || 0), 0),
        [filtered]
    );

    // Export to Excel
    const handleExport = () => {
        const exportData = filtered.map(detail => ({
            'Request ID': detail.requestId || '',
            'Asset Code': detail.assetCode || '',
            'Asset Name': detail.assetName || '',
            'Replacement Cost': detail.replacementCost || 0,
            'Approved By': detail.approvedBy || '',
            'Approved Date': detail.approvedAt
                ? new Date(detail.approvedAt).toLocaleDateString()
                : '',
            'Linked PO ID': detail.linkedPurchaseOrderId || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Replacement Costs');

        // Set column widths
        worksheet['!cols'] = [
            { wch: 12 },
            { wch: 12 },
            { wch: 20 },
            { wch: 18 },
            { wch: 15 },
            { wch: 14 },
            { wch: 14 },
        ];

        XLSX.writeFile(
            workbook,
            `replacement-costs-${new Date().toISOString().split('T')[0]}.xlsx`
        );
    };

    if (isLoading) {
        return (
            <div className="space-y-4 p-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Replacement Cost Details</h1>
                        <p className="text-sm text-muted-foreground">
                            All approved replacement assets with their costs
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Card */}
            <Card className="p-4 bg-gradient-to-r from-purple-50 to-purple-100">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                        <p className="text-2xl font-bold">₱{totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                        <p className="text-2xl font-bold">{filtered.length}</p>
                    </div>
                </div>
            </Card>

            {/* Search and Export */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by asset name, code, request ID, or approver..."
                        value={searchTerm}
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="pl-10"
                    />
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="gap-2 whitespace-nowrap"
                >
                    <Download className="h-4 w-4" />
                    Export to Excel
                </Button>
            </div>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Request ID</TableHead>
                            <TableHead>Asset</TableHead>
                            <TableHead className="text-right">Replacement Cost</TableHead>
                            <TableHead>Approved By</TableHead>
                            <TableHead>Approved Date</TableHead>
                            <TableHead>Linked PO</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map(detail => (
                                <TableRow key={detail.maintenanceRecordId}>
                                    <TableCell className="font-mono text-sm">
                                        {detail.requestId || '—'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <p className="font-medium">{detail.assetName || '—'}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {detail.assetCode || '—'}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        ₱{(detail.replacementCost || 0).toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                        })}
                                    </TableCell>
                                    <TableCell>{detail.approvedBy || '—'}</TableCell>
                                    <TableCell>
                                        {detail.approvedAt
                                            ? new Date(detail.approvedAt).toLocaleDateString()
                                            : '—'}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">
                                        {detail.linkedPurchaseOrderId || '—'}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="py-8 text-center">
                                    <p className="text-muted-foreground">
                                        No replacement cost records found
                                    </p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="gap-1"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                            if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 1 && page <= currentPage + 1)
                            ) {
                                return (
                                    <Button
                                        key={page}
                                        variant={page === currentPage ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setCurrentPage(page)}
                                        className="w-8 h-8 p-0"
                                    >
                                        {page}
                                    </Button>
                                );
                            }

                            if (
                                (page === 2 && currentPage > 3) ||
                                (page === totalPages - 1 && currentPage < totalPages - 2)
                            ) {
                                return (
                                    <span key={page} className="px-2">
                                        ...
                                    </span>
                                );
                            }

                            return null;
                        })}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            setCurrentPage(prev => Math.min(totalPages, prev + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="gap-1"
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
