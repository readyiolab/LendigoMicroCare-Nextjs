import React from 'react';
import { CreditCard, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { filterActivatableProductFees } from '@/lib/utils/feeBreakdown';

export default function FeeStructure({ product, onUpdateFee }) {
  const visibleFees = filterActivatableProductFees(product.fees);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-slate-800">Operational Fees & Charges</h3>
      </div>
      <Card className="rounded-md border border-zinc-800 bg-white overflow-hidden shadow-none [&_[data-slot=table-container]]:border-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white border-b border-zinc-800">
              <TableRow>
                <TableHead className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide py-2.5 pl-4 text-left">Fee Name</TableHead>
                <TableHead className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide py-2.5 text-center">Min (%)</TableHead>
                <TableHead className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide py-2.5 text-center">Max (%)</TableHead>
                <TableHead className="text-[10px] font-semibold text-slate-900 uppercase tracking-wide py-2.5 text-center">Default (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleFees.length === 0 ? (
                  <TableRow>
                      <TableCell colSpan="4" className="py-10 text-center text-slate-500 text-sm">No fees identified.</TableCell>
                  </TableRow>
              ) : visibleFees.map((fee) => (
                <TableRow key={fee.fee_code} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
                  <TableCell className="py-2.5 pl-4">
                    <div className="font-semibold text-slate-800 text-sm tracking-tight">{fee.fee_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide">{fee.fee_code}</div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex justify-center">
                      <Input
                        type="number"
                        step="0.1"
                        className="h-8 w-16 text-center text-xs border-slate-300 rounded-md bg-white focus:border-slate-900 transition-all"
                        value={fee.min_value}
                        onChange={(e) => onUpdateFee(fee.fee_code, 'min_value', e.target.value)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                     <div className="flex justify-center">
                      <Input
                        type="number"
                        step="0.1"
                        className="h-8 w-16 text-center text-xs border-slate-300 rounded-md bg-white focus:border-slate-900 transition-all"
                        value={fee.max_value}
                        onChange={(e) => onUpdateFee(fee.fee_code, 'max_value', e.target.value)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 pr-4">
                     <div className="flex justify-center">
                      <Input
                        type="number"
                        step="0.1"
                        className="h-8 w-20 text-center text-sm font-semibold border-slate-900 ring-1 ring-slate-950 rounded-md bg-white focus:ring-offset-1 transition-all"
                        value={fee.default_value}
                        onChange={(e) => onUpdateFee(fee.fee_code, 'default_value', e.target.value)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex items-start gap-2 bg-white p-3 rounded-md border border-slate-300">
         <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
         <p className="text-xs text-slate-600 leading-tight">These fees are calculated based on the requested principal amount and deducted upfront.</p>
      </div>
    </div>
  );
}
