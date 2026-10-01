import React from 'react';
import { Banknote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function ProductParameters({ product, onUpdateField }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
         <Banknote className="w-4 h-4 text-emerald-600" />
         <h3 className="text-sm font-semibold text-slate-800">Basic Parameters</h3>
      </div>
      
      <Card className="border-slate-300 shadow-none rounded-md">
        <CardContent className="p-4 space-y-4">
          
          <div className="space-y-3">
            <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Loan Amount (INR)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-600">Minimum</Label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                  <Input
                    type="number"
                    className="h-9 pl-8 text-sm border-slate-300 focus:border-slate-900 transition-all rounded-md"
                    value={product.min_amount}
                    onChange={(e) => onUpdateField('min_amount', parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-600">Maximum</Label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                  <Input
                    type="number"
                    className="h-9 pl-8 text-sm border-slate-300 focus:border-slate-900 transition-all rounded-md"
                    value={product.max_amount}
                    onChange={(e) => onUpdateField('max_amount', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-200" />

          <div className="space-y-3">
            <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Tenure & Duration</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-600">Min Days</Label>
                <Input
                  type="number"
                  className="h-9 text-sm border-slate-300 focus:border-slate-900 transition-all rounded-md"
                  value={product.min_tenure_days}
                  onChange={(e) => onUpdateField('min_tenure_days', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-600">Max Days</Label>
                <Input
                  type="number"
                  className="h-9 text-sm border-slate-300 focus:border-slate-900 transition-all rounded-md"
                  value={product.max_tenure_days}
                  onChange={(e) => onUpdateField('max_tenure_days', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          <Separator className="bg-slate-200" />

          <div className="space-y-3">
            <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Interest Configuration</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 uppercase">Min (%)</Label>
                <Input
                  type="number" step="0.1"
                  className="h-9 text-sm border-slate-300 focus:border-slate-900 transition-all rounded-md"
                  value={product.min_interest_rate_daily}
                  onChange={(e) => onUpdateField('min_interest_rate_daily', parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 uppercase">Max (%)</Label>
                <Input
                  type="number" step="0.1"
                  className="h-9 text-sm border-slate-300 focus:border-slate-900 transition-all rounded-md"
                  value={product.max_interest_rate_daily}
                  onChange={(e) => onUpdateField('max_interest_rate_daily', parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-900 uppercase">Default (%)</Label>
                <Input
                  type="number" step="0.1"
                  className="h-9 text-sm border-slate-900 ring-1 ring-slate-950 font-semibold rounded-md"
                  value={product.default_interest_rate_daily}
                  onChange={(e) => onUpdateField('default_interest_rate_daily', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
