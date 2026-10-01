import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { 
  Users, 
  Gift, 
  Copy, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Share2,
  Info,
  AlertCircle
} from 'lucide-react';
import { authAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

export default function Referrals() {
  const [stats, setStats] = useState({
    referral_code: '',
    total_referrals: 0,
    rewarded_referrals: 0,
    total_earned: 0,
    referral_history: []
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await authAPI.getReferralStats();
      if (response && response.status === 1 && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error fetching referral stats:', err);
      setError('Failed to load referral stats. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const code = stats?.referral_code || '';
    if (!code) return;
    const referralLink = `${window.location.origin}/register?ref=${code}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setSuccess('Referral link copied to clipboard!');
    setTimeout(() => {
      setCopied(false);
      setSuccess('');
    }, 3000);
  };

  const shareReferral = () => {
    const code = stats?.referral_code || '';
    if (!code) return;
    const referralLink = `${window.location.origin}/register?ref=${code}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join Lendigo Microcare',
        text: 'Get instant loans with Lendigo Microcare. Use my referral code to get a discount on your first processing fee!',
        url: referralLink,
      }).catch(console.error);
    } else {
      copyToClipboard();
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Spinner.Full />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-100">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="bg-green-50 text-green-900 border-green-100">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Hero Section */}
        <div className="relative overflow-hidden bg-black rounded-lg p-8 text-white shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl font-bold mb-4">Refer friends & earn rewards</h1>
            <p className="text-gray-400 text-lg mb-8">
              Share Lendigo Microcare with your friends. For every friend who gets their first loan disbursed, you get a ₹500 discount on your next processing fee!
            </p>
            
            <div className="flex flex-wrap gap-4 items-center">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-1 flex items-center gap-2 pl-4 pr-1">
                <span className="font-mono text-xl font-bold tracking-wider">{stats?.referral_code || '—'}</span>
                <button 
                  onClick={copyToClipboard}
                  className="bg-white text-black p-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <button 
                onClick={shareReferral}
                className="bg-white text-black px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Share Link
              </button>
            </div>
          </div>
          
          <Users className="absolute right-12 top-1/2 -translate-y-1/2 w-48 h-48 text-white/5 pointer-events-none" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Referred</p>
                <h3 className="text-2xl font-bold">{stats?.total_referrals || 0}</h3>
              </div>
            </div>
            <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
               <div className="bg-blue-600 h-full" style={{ width: '100%' }}></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Successful Referrals</p>
                <h3 className="text-2xl font-bold">{stats?.rewarded_referrals || 0}</h3>
              </div>
            </div>
            <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
               <div className="bg-green-600 h-full" style={{ width: `${((stats?.rewarded_referrals || 0) / (stats?.total_referrals || 1)) * 100}%` }}></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Gift className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Rewards Earned</p>
                <h3 className="text-2xl font-bold">₹{stats?.total_earned || 0}</h3>
              </div>
            </div>
            <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
               <div className="bg-purple-600 h-full" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white p-8 rounded-lg border border-gray-100 shadow-sm font-sans">
          <div className="flex items-center gap-2 mb-8">
            <Info className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-bold">How it works</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 relative">
             <div className="relative text-center">
                <div className="w-12 h-12 bg-black text-white rounded-lg flex items-center justify-center mx-auto mb-4 font-bold text-lg shadow-xl relative z-10">1</div>
                <h4 className="font-bold mb-2">Invite Friends</h4>
                <p className="text-sm text-gray-500">Share your unique referral link with your colleagues or friends.</p>
                {/* Connector line */}
                <div className="hidden sm:block absolute top-6 left-1/2 w-full border-t-2 border-dashed border-gray-100 -z-0"></div>
             </div>
             <div className="relative text-center">
                <div className="w-12 h-12 bg-black text-white rounded-lg flex items-center justify-center mx-auto mb-4 font-bold text-lg shadow-xl relative z-10">2</div>
                <h4 className="font-bold mb-2">They Get a Loan</h4>
                <p className="text-sm text-gray-500">Your friend signs up and gets their first loan disbursed.</p>
                {/* Connector line */}
                <div className="hidden sm:block absolute top-6 left-1/2 w-full border-t-2 border-dashed border-gray-100 -z-0"></div>
             </div>
             <div className="relative text-center">
                <div className="w-12 h-12 bg-green-500 text-white rounded-lg flex items-center justify-center mx-auto mb-4 font-bold text-lg shadow-xl relative z-10">
                   <Gift className="w-6 h-6" />
                </div>
                <h4 className="font-bold mb-2">You Get Rewarded</h4>
                <p className="text-sm text-gray-500">You receive a ₹500 discount on your next loan's processing fee!</p>
             </div>
          </div>
        </div>

        {/* Referral History */}
        <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h2 className="text-xl font-bold">My Referrals</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Friend</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date Invited</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(stats?.referral_history || []).length > 0 ? (
                  stats.referral_history.map((ref, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                             {ref.full_name?.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900">{ref.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(ref.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          ref.status === 'rewarded' 
                            ? 'bg-green-50 text-green-600' 
                            : 'bg-yellow-50 text-yellow-600'
                        }`}>
                          {ref.status === 'rewarded' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {ref.status === 'rewarded' ? 'Successful' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {ref.status === 'rewarded' ? `₹${ref.discount_amount}` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                       <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-gray-50 rounded-full text-gray-400">
                             <Users className="w-8 h-8" />
                          </div>
                          <p className="text-gray-500 font-medium">No referrals yet. Start inviting your friends!</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
