import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { MapPin, Eye } from 'lucide-react';

const MiniWorkspaceStat = ({ label, value }) => (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-lg text-gray-900 font-medium">{value}</div>
    </div>
);

export default function FieldsMasterTable({ 
    fields, 
    blockedLocations, 
    setSelectedFieldDetail, 
    setShowBlockedLocationSheet 
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_32%),linear-gradient(135deg,#ffffff_0%,#f8fafc_45%,#eef6ff_100%)] p-4 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-slate-950 p-3 text-white shadow-sm">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">Field Workspace</div>
              <div className="mt-1 text-xl tracking-tight text-slate-950 font-medium">Manage rule inputs and blocked locations</div>
              <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 font-medium">
                Business users can review all available rule fields here. When you need to stop sourcing in a risky area, use the blocked locations manager.
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniWorkspaceStat label="Available Fields" value={fields.length} />
            <MiniWorkspaceStat
              label="Location Fields"
              value={fields.filter((field) => String(field.field_category || '').toLowerCase().includes('location')).length}
            />
            <div className="col-span-2 sm:col-span-1">
              <Button onClick={() => setShowBlockedLocationSheet(true)} className="h-full min-h-[64px] w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100 uppercase tracking-widest text-[11px] py-4">
                Manage Blocked Locations
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-10" /> {/* Spacer */}

      <div className="grid grid-cols-1 gap-4">
        <Card className="border-none shadow-none">
          <CardHeader className="px-0 py-8 space-y-2">
            <CardTitle className="text-2xl font-medium tracking-tight text-slate-900 leading-none">Field Master</CardTitle>
            <CardDescription className="text-sm text-slate-500 font-medium">These are the data points available for building BRE rules.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white border-b border-slate-200">
                    <TableHead className="text-[11px] text-slate-500 uppercase tracking-widest pl-6">Field</TableHead>
                    <TableHead className="text-[11px] text-slate-500 uppercase tracking-widest">Type</TableHead>
                    <TableHead className="text-[11px] text-slate-500 uppercase tracking-widest">Business Group</TableHead>
                    <TableHead className="text-[11px] text-slate-500 uppercase tracking-widest">Allowed Checks</TableHead>
                    <TableHead className="text-right text-[11px] text-slate-500 uppercase tracking-widest pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                  {fields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                        No field metadata found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    fields.map((field) => (
                      <TableRow
                        key={field.id || field.field_key}
                        className="cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-200 last:border-0 group"
                        onClick={() => setSelectedFieldDetail(field)}
                      >
                        <TableCell className="py-10 pl-10">
                          <div className="flex flex-col gap-2">
                            <span className="text-base font-normal text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{field.field_label || field.field_key}</span>
                            <span className="text-[10px] text-slate-400 font-normal tracking-tighter opacity-70 bg-slate-50 w-fit px-2 py-0.5 rounded-md">{field.field_key}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-10">
                            <Badge variant="outline" className="font-normal text-[10px] text-slate-600 px-3 py-1 border-slate-100 bg-slate-50 capitalize">
                                {field.field_type}
                            </Badge>
                        </TableCell>
                        <TableCell className="py-10">
                            <span className="text-sm text-slate-600 font-normal tracking-tight">{field.field_category}</span>
                        </TableCell>
                        <TableCell className="py-10">
                          <div className="flex flex-wrap gap-2 max-w-[240px]">
                            {(Array.isArray(field.allowed_operators) ? field.allowed_operators : []).map((op) => (
                              <span key={op} className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded-lg font-normal font-mono border border-blue-100">
                                {op}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="py-10 text-right pr-10">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-11 px-6 rounded-lg border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 font-normal gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Metadata
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
