import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle } from 'lucide-react';

const LocationSection = memo(({ formData, handlePincodeChange, handleInputChange, fieldErrors, pincodeLoading }) => (
  <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
          <h4 className="text-sm font-semibold text-zinc-900 uppercase tracking-tight">Current Location</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
              <Label htmlFor="pincode" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Pincode</Label>
              <div className="relative">
                  <Input
                      id="pincode"
                      name="pincode"
                      value={formData.pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      placeholder="000000"
                      required
                      maxLength={6}
                      className={`h-9 text-sm bg-white border-zinc-200 focus:ring-zinc-900 ${fieldErrors.pincode ? "border-red-500" : ""}`}
                  />
                  {pincodeLoading && <Spinner className="absolute right-3 top-2.5 w-4 h-4 text-slate-500" />}
              </div>
              {fieldErrors.pincode && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.pincode}</p>}
          </div>
          <div className="space-y-1.5">
              <Label htmlFor="city" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">City</Label>
              <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                placeholder={pincodeLoading ? "Searching..." : "Enter City"}
                  className={`h-9 text-sm border-zinc-200 focus:ring-zinc-900 ${formData.city ? "bg-zinc-50/50 text-zinc-600 font-medium" : "bg-white"} ${pincodeLoading ? "opacity-70 animate-pulse border-blue-200" : ""} ${fieldErrors.city ? "border-red-500" : ""}`}
                  required
              />
              {fieldErrors.city && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.city}</p>}
          </div>
          <div className="space-y-1.5">
              <Label htmlFor="state" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">State</Label>
              <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                placeholder={pincodeLoading ? "Searching..." : "Enter State"}
                  className={`h-9 text-sm border-zinc-200 focus:ring-zinc-900 ${formData.state ? "bg-zinc-50/50 text-zinc-600 font-medium" : "bg-white"} ${pincodeLoading ? "opacity-70 animate-pulse border-blue-200" : ""} ${fieldErrors.state ? "border-red-500" : ""}`}
                  required
              />
              {fieldErrors.state && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.state}</p>}
          </div>

          <div className="col-span-1 md:col-span-3 space-y-1.5">
              <Label htmlFor="currentAddress" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Full Address</Label>
              <Input
                  id="currentAddress"
                  name="currentAddress"
                  value={formData.currentAddress}
                  onChange={handleInputChange}
                  placeholder="House No, Street, Landmark, Area"
                  required
                  className={`h-9 text-sm bg-white border-zinc-200 focus:ring-zinc-900 ${fieldErrors.currentAddress ? "border-red-500" : ""}`}
              />
              {fieldErrors.currentAddress && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.currentAddress}</p>}
          </div>
      </div>
  </div>
));

export default LocationSection;
