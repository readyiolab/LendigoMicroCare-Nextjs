import React from 'react';
import { useNavigate } from '@/lib/router';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans">
            {/* Abstract Background Element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[100px] opacity-50 -z-10" />
            
            <div className="space-y-8 max-w-md animate-in fade-in zoom-in duration-700">
                <div className="relative inline-block">
                    <h1 className="text-[180px] font-black leading-none text-gray-900 tracking-tighter select-none">
                        404
                    </h1>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-8 bg-blue-200/40 blur-xl md:h-12" />
                </div>
                
                <div className="space-y-3">
                    <h2 className="text-3xl font-bold text-gray-900">Page Not Found</h2>
                    <p className="text-gray-500 text-lg leading-relaxed">
                        Oops! It seems you've wandered into unplanned territory. The page you're looking for doesn't exist or has moved.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Button 
                        onClick={() => navigate(-1)} 
                        variant="outline"
                        className="w-full sm:w-auto px-8 h-12 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Go Back
                    </Button>
                    <Button 
                        onClick={() => navigate('/dashboard')} 
                        className="w-full sm:w-auto px-8 h-12 bg-black text-white font-bold hover:bg-zinc-800 shadow-xl shadow-gray-200 transition-all active:scale-95"
                    >
                        <Home className="w-5 h-5 mr-2" />
                        Dashboard
                    </Button>
                </div>
            </div>

            <footer className="fixed bottom-12 text-gray-400 text-xs font-medium tracking-widest uppercase">
                Lendigo Microcare
            </footer>
        </div>
    );
};

export default NotFound;
