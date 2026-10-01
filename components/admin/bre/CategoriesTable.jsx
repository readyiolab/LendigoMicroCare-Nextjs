import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { CheckCircle, Eye, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StatusBadge = ({ active }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
        active 
        ? 'bg-green-100 text-green-800' 
        : 'bg-gray-100 text-gray-800'
    }`}>
        {active ? 'Active' : 'Inactive'}
    </span>
);

const SectionHero = ({ icon: Icon, eyebrow, title, description }) => (
    <div className="rounded-lg border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.18),_transparent_32%),linear-gradient(135deg,#ffffff_0%,#f8fafc_45%,#eef2f7_100%)] p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-slate-950 p-3 text-white shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{eyebrow}</div>
          <div className="mt-1 text-xl tracking-tight text-slate-950">{title}</div>
          <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 font-medium">{description}</div>
        </div>
      </div>
    </div>
);

export default function CategoriesTable({ 
    categories, 
    rules, 
    setSelectedCategoryDetail 
}) {
  return (
    <div className="space-y-4">
      <div className="mb-10">
        <SectionHero
          icon={CheckCircle}
          eyebrow="Category Workspace"
          title="Browse business rule groups"
          description="Each category organizes similar rules together. Click any row to open full details in a side sheet."
        />
      </div>

      <Card className="border-none shadow-none">
        <CardHeader className="px-0 py-6 space-y-2">
          <CardTitle className="text-2xl font-medium tracking-tight text-slate-900 leading-none">Rule Categories</CardTitle>
          <CardDescription className="text-sm text-slate-500 font-medium">Click a category to view description, status, display order, and linked rule count.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-white border-b border-slate-200">
                  <TableHead className="text-[11px] text-slate-500 uppercase tracking-widest pl-6">Name</TableHead>
                  <TableHead className="text-[11px] text-slate-500 uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-[11px] text-slate-500 uppercase tracking-widest text-center">Display Order</TableHead>
                  <TableHead className="text-[11px] text-slate-500 uppercase tracking-widest text-center">Linked Rules</TableHead>
                  <TableHead className="text-right text-[11px] text-slate-500 uppercase tracking-widest pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-50">
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                      No categories found.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow
                      key={category.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors border-b border-gray-50 last:border-none group"
                      onClick={() => setSelectedCategoryDetail(category)}
                    >
                      <TableCell className="py-10 pl-10">
                        <div className="flex flex-col gap-2">
                            <span className="text-base font-normal text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{category.category_name}</span>
                            <span className="text-sm text-slate-500 font-normal tracking-tight line-clamp-1 max-w-xl">
                                {category.category_description || 'No description added yet for this business category.'}
                            </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-10 px-4">
                          <StatusBadge active={category.is_active} />
                      </TableCell>
                      <TableCell className="py-10 text-center text-slate-600 font-normal">
                          {category.display_order ?? '-'}
                      </TableCell>
                      <TableCell className="py-10 text-center">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none font-normal px-5 py-1.5 rounded-full">
                            {rules.filter((rule) => String(rule.category_id) === String(category.id)).length} Active
                          </Badge>
                      </TableCell>
                      <TableCell className="py-10 text-right pr-10">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-11 px-6 rounded-lg border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 font-normal gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Records
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
  );
}
