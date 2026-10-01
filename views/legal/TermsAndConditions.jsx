'use client';

import React from 'react';
import { useNavigate } from '@/lib/router';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { TERMS_AND_CONDITIONS } from '@/data/legalTexts';

export default function TermsAndConditions() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Terms & Conditions</h1>
      </div>
      <div className="max-w-4xl mx-auto p-6 md:p-10 w-full">
        <div className="bg-white p-6 md:p-10 rounded-lg shadow-sm border border-gray-200">
            <div className="prose prose-sm md:prose-base max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                {TERMS_AND_CONDITIONS}
            </div>
        </div>
      </div>
    </div>
  );
}
