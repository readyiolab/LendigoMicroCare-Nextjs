import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { normalizeEmploymentType } from './validateEligibility';

const EmploymentSection = memo(({ formData, handleInputChange, fieldErrors }) => (
  <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
          <h4 className="text-sm font-semibold text-zinc-900 uppercase tracking-tight">Employment Details</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
           <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Employment Type</Label>
              <select
                  id="employmentType"
                  name="employmentType"
                  value={normalizeEmploymentType(formData.employmentType)}
                  onChange={handleInputChange}
                  className={`h-9 w-full rounded-md border px-3 text-sm bg-white border-zinc-200 focus:ring-zinc-900 ${fieldErrors.employmentType ? "border-red-500" : ""}`}
              >
                  <option value="salaried">Salaried</option>
                  <option value="self_employed">Self Employed</option>
                  <option value="business">Business</option>
                  <option value="professional">Professional</option>
                  <option value="other">Other</option>
              </select>
              {fieldErrors.employmentType && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.employmentType}</p>}
          </div>

          <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Company Name</Label>
              <Input
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="e.g. Acme Corp"
                  required
                  className={`h-9 text-sm bg-white border-zinc-200 focus:ring-zinc-900 ${fieldErrors.companyName ? "border-red-500" : ""}`}
              />
              {fieldErrors.companyName && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.companyName}</p>}
          </div>

          <div className="space-y-1.5">
              <Label htmlFor="companyType" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Company Type</Label>
              <select
                  id="companyType"
                  name="companyType"
                  value={formData.companyType || ''}
                  onChange={handleInputChange}
                  className={`h-9 w-full rounded-md border px-3 text-sm bg-white border-zinc-200 focus:ring-zinc-900 ${fieldErrors.companyType ? "border-red-500" : ""}`}
              >
                  <option value="" disabled>Select Type</option>
                  <option value="Private Limited">Private Limited</option>
                  <option value="Public Limited">Public Limited</option>
                  <option value="Partnership">Partnership</option>
                  <option value="LLP">LLP</option>
                  <option value="Government">Government</option>
                  <option value="PSU">PSU</option>
                  <option value="MNC">MNC</option>
                  <option value="Startup">Startup</option>
                  <option value="Proprietorship">Proprietorship</option>
                  <option value="NGO">NGO</option>
                  <option value="Other">Other</option>
              </select>
              {fieldErrors.companyType && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.companyType}</p>}
          </div>

          <div className="space-y-1.5">
              <Label htmlFor="netMonthlyIncome" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Net Monthly Income</Label>
              <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 text-sm">₹</span>
                  <Input
                      id="netMonthlyIncome"
                      type="number"
                      name="netMonthlyIncome"
                      value={formData.netMonthlyIncome}
                      onChange={handleInputChange}
                      placeholder="00000"
                      required
                      className={`h-9 pl-7 text-sm bg-white border-zinc-200 focus:ring-zinc-900 ${fieldErrors.netMonthlyIncome ? "border-red-500" : ""}`}
                  />
              </div>
              {fieldErrors.netMonthlyIncome && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.netMonthlyIncome}</p>}
          </div>

           <div className="space-y-1.5">
              <Label htmlFor="nextSalaryDate" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Next Salary Date</Label>
              <Input
                  id="nextSalaryDate"
                  type="date"
                  name="nextSalaryDate"
                  value={formData.nextSalaryDate}
                  onChange={handleInputChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  max={new Date(new Date().getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className={`h-9 text-sm bg-white border-zinc-200 focus:ring-zinc-900 ${fieldErrors.nextSalaryDate ? "border-red-500" : ""}`}
              />
              {fieldErrors.nextSalaryDate && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.nextSalaryDate}</p>}
          </div>

          <div className="space-y-1.5">
              <Label htmlFor="currentJobJoiningDate" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Current Job Joining</Label>
              <Input
                  id="currentJobJoiningDate"
                  type="date"
                  name="currentJobJoiningDate"
                  value={formData.currentJobJoiningDate}
                  onChange={handleInputChange}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className={`h-9 text-sm bg-white border-zinc-200 focus:ring-zinc-900 ${fieldErrors.currentJobJoiningDate ? "border-red-500" : ""}`}
              />
              {fieldErrors.currentJobJoiningDate && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.currentJobJoiningDate}</p>}
          </div>

          <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Total Work Experience
              </Label>
              <div className="flex gap-2">
                  <div className="flex-1">
                      <select
                          value={formData.workExpYears || ''}
                          id="workExpYears"
                          name="workExpYears"
                          onChange={handleInputChange}
                          className={`h-9 w-full rounded-md border px-3 text-sm bg-white border-zinc-200 focus:ring-zinc-900 ${fieldErrors.workExpYears ? "border-red-500" : ""}`}
                      >
                          <option value="" disabled>Years</option>
                          {[...Array(31)].map((_, i) => (
                              <option key={i} value={String(i)}>{i} {i === 1 ? 'Year' : 'Years'}</option>
                          ))}
                      </select>
                  </div>
                  <div className="flex-1">
                      <select
                          value={formData.workExpMonths || ''}
                          id="workExpMonths"
                          name="workExpMonths"
                          onChange={handleInputChange}
                          className={`h-9 w-full rounded-md border px-3 text-sm bg-white border-zinc-200 focus:ring-zinc-900 ${fieldErrors.workExpMonths ? "border-red-500" : ""}`}
                      >
                          <option value="" disabled>Months</option>
                          {[...Array(12)].map((_, i) => (
                              <option key={i} value={String(i)}>{i} {i === 1 ? 'Month' : 'Months'}</option>
                          ))}
                      </select>
                  </div>
              </div>
              {(fieldErrors.workExpYears || fieldErrors.workExpMonths) && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.workExpYears || fieldErrors.workExpMonths}</p>}
          </div>
      </div>
  </div>
));

export default EmploymentSection;
