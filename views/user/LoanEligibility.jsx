import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Briefcase, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { loanAPI, utilityAPI } from '@/lib/api';
import { cn } from "@/lib/utils";

export default function LoanEligibility() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    pancard: '',
    dob: '',
    gender: 'male',
    personalEmail: '',
    employmentType: 'salaried',
    companyName: '',
    companyType: '',
    currentJobJoiningDate: '',
    workExperienceStartDate: '',
    nextSalaryDate: '',
    netMonthlyIncome: '',
    pincode: '',
    state: '',
    city: '',
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Quick validation for PAN card
    if (name === 'pancard') {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (value.length === 10 && !panRegex.test(value.toUpperCase())) {
        setFieldErrors(prev => ({ ...prev, pancard: 'Invalid PAN format (e.g., ABCDE1234F)' }));
      } else {
        setFieldErrors(prev => ({ ...prev, pancard: '' }));
      }
    } else if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePincodeChange = async (value) => {
    const cleanedValue = value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, pincode: cleanedValue, state: '', city: '' }));
    if (fieldErrors.pincode) {
        setFieldErrors(prev => ({ ...prev, pincode: '' }));
    }
    
    if (cleanedValue.length === 6) {
      setPincodeLoading(true);
      try {
        const response = await utilityAPI.getPincodeDetails(cleanedValue);
        if (response.status === 1 && response.data) {
          setFormData(prev => ({
            ...prev,
            state: response.data.state || '',
            city: response.data.city || '',
          }));
        }
      } catch (err) {
        console.error('Failed to fetch pincode details:', err);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    setSuccess('');
    
    // Client-side validation: PAN Card format
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (formData.pancard && !panRegex.test(formData.pancard.toUpperCase())) {
      setFieldErrors(prev => ({
        ...prev,
        pancard: 'Invalid PAN format. Correct format: ABCDE1234F'
      }));
      setLoading(false);
      return;
    }

    try {
      const payload = {
         ...formData,
         netMonthlyIncome: parseFloat(formData.netMonthlyIncome),
      };

      const response = await loanAPI.checkEligibility(payload);
      
      if (response.status === 1) {
        setSuccess('Congratulations! You are eligible for a loan.');
        // Navigate or show success state
        setTimeout(() => {
             navigate('/dashboard'); // Or wherever appropriate
        }, 2000);
      } else {
        setError(response.message || 'Sorry, you do not meet the eligibility criteria at this time.');
      }
    } catch (err) {
       if (err.response && err.response.data && err.response.data.errors) {
          const newErrors = {};
           err.response.data.errors.forEach(error => {
              if (error.path) newErrors[error.path] = error.msg;
          });
          setFieldErrors(newErrors);
          if (Object.keys(newErrors).length === 0) setError(err.response.data.errors[0].msg);
      } else {
          setError(err.message || 'An error occurred during verification');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Check Your Loan Eligibility</h1>
          <p className="mt-2 text-gray-500 text-lg">Enter your details to see if you're pre-approved.</p>
        </div>

        {error && (
            <Alert variant="destructive" className="mb-6 bg-red-50 border-red-100 text-red-900">
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        {success && (
            <Alert className="mb-6 bg-green-50 border-green-100 text-green-900">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>{success}</AlertDescription>
            </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
            {/* Personal Details Section */}
            <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-100">
                <h4 className="flex items-center gap-3 text-xl font-semibold text-gray-900 mb-6">
                    <div className="p-2.5 bg-black/5 text-black rounded-lg"><User className="w-5 h-5" /></div>
                    Personal Identity
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">PAN Card Number</Label>
                        <Input 
                            name="pancard" 
                            placeholder="e.g., ABCDE1234F" 
                            value={formData.pancard} 
                            onChange={(e) => handleInputChange({ target: { name: 'pancard', value: e.target.value.toUpperCase() } })}
                            required
                            maxLength={10}
                            className={cn("h-12 text-base bg-gray-50/50 focus:bg-white transition-colors", fieldErrors.pancard && "border-red-500 focus-visible:ring-red-500")}
                        />
                        {fieldErrors.pancard && <p className="text-red-500 text-xs mt-1">{fieldErrors.pancard}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dob" className="text-sm font-medium text-gray-700">Date of Birth</Label>
                        <Input
                          id="dob"
                          name="dob"
                          type="date"
                          value={formData.dob}
                          onChange={handleInputChange}
                          className={cn("h-12 text-base bg-gray-50/50 focus:bg-white transition-colors", fieldErrors.dob && "border-red-500 focus-visible:ring-red-500")}
                          required
                        />
                        {fieldErrors.dob && <p className="text-red-500 text-xs mt-1">{fieldErrors.dob}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Gender</Label>
                        <select
                            value={formData.gender}
                            onChange={(e) => setFormData(p => ({ ...p, gender: e.target.value }))}
                            className={cn("w-full h-12 rounded-md border border-input px-3 text-base bg-gray-50/50 focus:bg-white transition-colors", fieldErrors.gender && "border-red-500 ring-offset-red-500")}
                        >
                            <option value="" disabled>Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                        {fieldErrors.gender && <p className="text-red-500 text-xs mt-1">{fieldErrors.gender}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="personalEmail" className="text-sm font-medium text-gray-700">Personal Email</Label>
                        <Input 
                            id="personalEmail"
                            type="email" 
                            name="personalEmail" 
                            value={formData.personalEmail} 
                            onChange={handleInputChange}
                            placeholder="e.g., john@example.com"
                            required
                            className={cn("h-12 text-base bg-gray-50/50 focus:bg-white transition-colors", fieldErrors.personalEmail && "border-red-500 focus-visible:ring-red-500")}
                        />
                        {fieldErrors.personalEmail && <p className="text-red-500 text-xs mt-1">{fieldErrors.personalEmail}</p>}
                    </div>
                </div>
            </div>

            {/* Employment Details Section */}
            <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-100">
                <h4 className="flex items-center gap-3 text-xl font-semibold text-gray-900 mb-6">
                    <div className="p-2.5 bg-black/5 text-black rounded-lg"><Briefcase className="w-5 h-5" /></div>
                     Employment Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                     <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Employment Type</Label>
                        <select
                            value={formData.employmentType}
                            onChange={(e) => setFormData(p => ({ ...p, employmentType: e.target.value }))}
                            className={cn("w-full h-12 rounded-md border border-input px-3 text-base bg-gray-50/50 focus:bg-white transition-colors", fieldErrors.employmentType && "border-red-500 ring-offset-red-500")}
                        >
                            <option value="salaried">Salaried</option>
                            <option value="self_employed">Self Employed</option>
                        </select>
                        {fieldErrors.employmentType && <p className="text-red-500 text-xs mt-1">{fieldErrors.employmentType}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">Company Name</Label>
                        <Input 
                            id="companyName"
                            name="companyName" 
                            value={formData.companyName} 
                            onChange={handleInputChange}
                            placeholder="e.g., Acme Corporation"
                            required
                            className={cn("h-12 text-base bg-gray-50/50 focus:bg-white transition-colors", fieldErrors.companyName && "border-red-500 focus-visible:ring-red-500")}
                        />
                        {fieldErrors.companyName && <p className="text-red-500 text-xs mt-1">{fieldErrors.companyName}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="companyType" className="text-sm font-medium text-gray-700">Company Type</Label>
                        <select
                            id="companyType"
                            value={formData.companyType || ''}
                            onChange={(e) => setFormData(p => ({ ...p, companyType: e.target.value }))}
                            className={cn("w-full h-12 rounded-md border border-input px-3 text-base bg-gray-50/50 focus:bg-white transition-colors", fieldErrors.companyType && "border-red-500 ring-offset-red-500")}
                        >
                            <option value="" disabled>e.g., Private Limited</option>
                            <option value="Private Limited">Private Limited</option>
                            <option value="Public Limited">Public Limited</option>
                            <option value="Partnership">Partnership</option>
                            <option value="Proprietorship">Proprietorship</option>
                            <option value="LLP">LLP</option>
                            <option value="Government">Government</option>
                            <option value="PSU">PSU</option>
                            <option value="MNC">MNC</option>
                            <option value="Startup">Startup</option>
                            <option value="NGO">NGO</option>
                            <option value="Other">Other</option>
                        </select>
                        {fieldErrors.companyType && <p className="text-red-500 text-xs mt-1">{fieldErrors.companyType}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="netMonthlyIncome" className="text-sm font-medium text-gray-700">Net Monthly Income (₹)</Label>
                        <Input 
                            id="netMonthlyIncome"
                            type="number"
                            name="netMonthlyIncome" 
                            value={formData.netMonthlyIncome} 
                            onChange={handleInputChange}
                            placeholder="e.g., 50000"
                            required
                            className={cn("h-12 text-base bg-gray-50/50 focus:bg-white transition-colors", fieldErrors.netMonthlyIncome && "border-red-500 focus-visible:ring-red-500")}
                        />
                        {fieldErrors.netMonthlyIncome && <p className="text-red-500 text-xs mt-1">{fieldErrors.netMonthlyIncome}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="nextSalaryDate" className="text-sm font-medium text-gray-700">Next Salary Date</Label>
                        <Input 
                            id="nextSalaryDate"
                            type="date" 
                            name="nextSalaryDate" 
                            value={formData.nextSalaryDate} 
                            onChange={handleInputChange}
                            required
                            className={cn("h-12 text-base bg-gray-50/50 focus:bg-white transition-colors", fieldErrors.nextSalaryDate && "border-red-500 focus-visible:ring-red-500")}
                        />
                        {fieldErrors.nextSalaryDate && <p className="text-red-500 text-xs mt-1">{fieldErrors.nextSalaryDate}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="currentJobJoiningDate" className="text-sm font-medium text-gray-700">Current Job Joining Date</Label>
                        <Input 
                            id="currentJobJoiningDate"
                            type="date" 
                            name="currentJobJoiningDate" 
                            value={formData.currentJobJoiningDate} 
                            onChange={handleInputChange}
                            className={cn("h-12 text-base bg-gray-50/50 focus:bg-white transition-colors", fieldErrors.currentJobJoiningDate && "border-red-500 focus-visible:ring-red-500")}
                        />
                        {fieldErrors.currentJobJoiningDate && <p className="text-red-500 text-xs mt-1">{fieldErrors.currentJobJoiningDate}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="workExperienceStartDate" className="text-sm font-medium text-gray-700">Total Work Experience Start</Label>
                        <Input 
                            id="workExperienceStartDate"
                            type="date" 
                            name="workExperienceStartDate" 
                            value={formData.workExperienceStartDate} 
                            onChange={handleInputChange}
                            className={cn("h-12 text-base bg-gray-50/50 focus:bg-white transition-colors", fieldErrors.workExperienceStartDate && "border-red-500 focus-visible:ring-red-500")}
                        />
                        {fieldErrors.workExperienceStartDate && <p className="text-red-500 text-xs mt-1">{fieldErrors.workExperienceStartDate}</p>}
                    </div>
                </div>
            </div>

            {/* Location Section */}
            <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-100">
                <h4 className="flex items-center gap-3 text-xl font-semibold text-gray-900 mb-6">
                    <div className="p-2.5 bg-black/5 text-black rounded-lg"><MapPin className="w-5 h-5" /></div>
                    Current Location
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="pincode" className="text-sm font-medium text-gray-700">Pincode</Label>
                        <div className="relative">
                            <Input 
                                id="pincode"
                                name="pincode" 
                                value={formData.pincode} 
                                onChange={(e) => handlePincodeChange(e.target.value)}
                                placeholder="e.g., 400001"
                                required
                                maxLength={6}
                                className={cn("h-12 text-base bg-gray-50/50 focus:bg-white transition-colors", fieldErrors.pincode && "border-red-500 focus-visible:ring-red-500")}
                            />
                            {pincodeLoading && <Spinner className="absolute right-3 top-3.5" />}
                        </div>
                        {fieldErrors.pincode && <p className="text-red-500 text-xs mt-1">{fieldErrors.pincode}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">City</Label>
                        <Input 
                            name="city" 
                            value={formData.city} 
                            readOnly
                            className="h-12 text-base bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">State</Label>
                        <Input 
                            name="state" 
                            value={formData.state} 
                            readOnly
                            className="h-12 text-base bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                    </div>
                </div>
            </div>

            <Button 
                type="submit" 
                disabled={loading}
                loading={loading}
                className="w-full h-11 text-base font-bold bg-white hover:bg-slate-100 text-white shadow-lg shadow-zinc-200 transition-all rounded-lg"
            >
                Verify & Check Eligibility
                <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
        </form>
      </div>
    </MainLayout>
  );
}
