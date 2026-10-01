import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";

export default function BlockedLocationsSheet({ 
    isOpen, 
    onOpenChange, 
    blockedTab, 
    setBlockedTab, 
    error, 
    blockedLocations, 
    handleRemoveBlockedLocation, 
    locationForm, 
    setLocationForm, 
    blockingLocation, 
    handleAddBlockedLocation 
}) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Blocked Locations</SheetTitle>
          <SheetDescription>
            Manage the pincode and state list used by BRE location checks.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 mt-6">
          <Tabs value={blockedTab} onValueChange={setBlockedTab} className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <TabsTrigger value="current" className="rounded-lg py-2.5">Current Blocked List</TabsTrigger>
              <TabsTrigger value="add" className="rounded-lg py-2.5">Block New Location</TabsTrigger>
            </TabsList>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-950 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                {error}
              </div>
            )}

            <TabsContent value="current" className="space-y-3 pt-2">
              {blockedLocations.length === 0 ? (
                <div className="rounded-lg border border-dashed p-5 text-sm font-medium text-slate-600 text-center">
                  No blocked locations yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedLocations.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-white group">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-white font-medium uppercase text-[10px]">{item.block_type}</Badge>
                          <span className="text-sm text-slate-950 font-medium">{item.value}</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-600 font-medium leading-relaxed">"{item.reason || 'No reason added.'}"</div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs rounded-lg px-3 opacity-40 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveBlockedLocation(item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="add" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 mt-6">
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-widest text-slate-500 font-medium">Block Type</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    value={locationForm.block_type}
                    onChange={(e) => setLocationForm((prev) => ({ ...prev, block_type: e.target.value }))}
                  >
                    <option value="pincode">Pincode</option>
                    <option value="state">State</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-widest text-slate-500 font-medium">
                    {locationForm.block_type === 'pincode' ? 'Pincode to block' : 'State to block'}
                  </label>
                  <Input
                    placeholder={locationForm.block_type === 'pincode' ? 'Example: 560001' : 'Example: Delhi'}
                    className="h-11 rounded-lg border-gray-200 bg-gray-50/30 focus:bg-white transition-all px-4"
                    value={locationForm.value}
                    onChange={(e) => setLocationForm((prev) => ({ ...prev, value: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-widest text-slate-500 font-medium">Reason</label>
                  <Textarea
                    rows={4}
                    placeholder="Why should this location be blocked?"
                    className="rounded-lg border-gray-200 bg-gray-50/30 focus:bg-white transition-all p-4 min-h-[120px]"
                    value={locationForm.reason}
                    onChange={(e) => setLocationForm((prev) => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handleAddBlockedLocation} 
                  disabled={blockingLocation || !locationForm.value} 
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-11 shadow-lg shadow-slate-100 uppercase tracking-widest text-[11px] mt-2"
                >
                  {blockingLocation ? 'Saving...' : `Block ${locationForm.block_type === 'pincode' ? 'Pincode' : 'State'}`}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
