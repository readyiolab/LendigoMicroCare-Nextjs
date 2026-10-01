import React, { useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { 
  Headphones, 
  Mail, 
  Phone, 
  MessageSquare, 
  Send, 
  ChevronDown, 
  ExternalLink,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Alert, 
  AlertDescription 
} from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    question: "How long does it take for loan approval?",
    answer: "Typically, loan applications are reviewed within 2-4 hours during business days. If additional documents are required, it may take up to 24 hours."
  },
  {
    question: "When will the money be credited to my account?",
    answer: "Once your loan is approved and you have signed the agreement, the amount is usually disbursed within 2 hours."
  },
  {
    question: "Can I prepay my loan?",
    answer: "Yes, you can prepay your loan at any time through the 'Repayment' section on your dashboard. There are no additional charges for early repayment."
  },
  {
    question: "How do I increase my loan limit?",
    answer: "Your loan limit is automatically reviewed based on your repayment history. Consistent and timely repayments will lead to higher limits and lower interest rates over time."
  }
];

export default function Support() {
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setFormData({ subject: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    }, 1500);
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-white rounded-lg p-8 md:p-12 text-white shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-4xl font-bold mb-4 tracking-tight">How can we help?</h1>
            <p className="text-slate-500 text-lg">
              Our support team is here to assist you 24/7. Whether you have a question about your loan or need technical help, we're just a message away.
            </p>
          </div>
          <Headphones className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/5 pointer-events-none" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Contact Cards */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold px-1">Quick Contact</h2>
            
            <div className="bg-white p-5 rounded-lg border border-zinc-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Email Us</p>
                  <p className="font-bold text-zinc-900">support@lendigomicrocare.com</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-zinc-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-lg text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">WhatsApp</p>
                  <p className="font-bold text-zinc-900">+91 98765 43210</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-zinc-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Call Us</p>
                  <p className="font-bold text-zinc-900">1800-123-4567</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 p-6 rounded-lg border border-dashed border-zinc-200">
              <h4 className="font-bold text-zinc-900 mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Operational Hours
              </h4>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Our digital support is available 24/7. Phone support is available Monday to Saturday, 9:00 AM - 8:00 PM.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-lg border border-zinc-100 shadow-sm h-full">
              <h2 className="text-2xl font-bold mb-6 tracking-tight">Send us a message</h2>
              
              {submitted && (
                <Alert className="mb-6 bg-green-50 border-green-100 text-green-800">
                  <Send className="h-4 w-4" />
                  <AlertDescription>
                    Your message has been received! Our team will get back to you within 2-4 hours.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-zinc-700 font-medium">Subject</Label>
                  <Input 
                    id="subject"
                    placeholder="E.g. Loan Disbursal Query"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="h-12 bg-zinc-50 border-zinc-100 focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-zinc-700 font-medium">Message Details</Label>
                  <Textarea 
                    id="message"
                    placeholder="Tell us what you need help with..."
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="bg-zinc-50 border-zinc-100 focus:bg-white transition-colors resize-none"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full h-14 bg-white hover:bg-slate-100 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  {submitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* FAQs Section */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-2xl font-bold tracking-tight">Frequently Asked Questions</h2>
            <Button variant="link" className="text-slate-500 font-bold">View all FAQs</Button>
          </div>

          <div className="bg-white rounded-lg border border-zinc-100 shadow-sm overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-b border-zinc-50 last:border-0 px-6">
                  <AccordionTrigger className="hover:no-underline py-6">
                    <span className="text-left font-bold text-zinc-900">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-zinc-600 leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* Support Banner */}
        <div className="bg-indigo-600 rounded-lg p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1">
            <h3 className="text-xl font-bold">Need immediate assistance?</h3>
            <p className="text-indigo-100 opacity-90">Our live chat agents are available to help you right now.</p>
          </div>
          <Button className="bg-white text-indigo-600 hover:bg-indigo-50 h-12 px-8 rounded-lg font-bold border-0 shadow-sm">
            Start Live Chat
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
