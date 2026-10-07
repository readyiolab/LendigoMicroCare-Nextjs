import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import MainLayout from '@/components/layouts/MainLayout';
import { Shield, CheckCircle2, Smartphone } from 'lucide-react';

export default function Setup2FA() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState('info'); // 'info', 'setup', 'verify'
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (user?.twoFactorEnabled) {
      setIsEnabled(true);
    }
  }, [user]);

  const handleSetup2FA = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await authAPI.setup2FA({ enable: true });
      if (response.status === 1) {
        setQrCode(response.data.qrCode);
        setSecret(response.data.secret);
        setStep('setup');
        setMessage('QR code generated. Please scan it with your authenticator app.');
      }
    } catch (err) {
      setError(err.message || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verify2FA({ token: verificationToken });
      if (response.status === 1) {
        setMessage('2FA enabled successfully!');
        setStep('success');
        setIsEnabled(true);
        // Update user in context
        if (user) {
          updateUser({ ...user, twoFactorEnabled: true });
        }
      }
    } catch (err) {
      setError(err.message || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.disable2FA({ token: verificationToken });
      if (response.status === 1) {
        setMessage('2FA disabled successfully');
        setIsEnabled(false);
        setStep('info');
        setVerificationToken('');
        if (user) {
          updateUser({ ...user, twoFactorEnabled: false });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <CardTitle>2FA Enabled Successfully!</CardTitle>
                  <CardDescription>Your account is now protected with two-factor authentication</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  From now on, when you log in, you'll need to enter both your OTP and the 6-digit code from your authenticator app.
                </AlertDescription>
              </Alert>
              <div className="flex gap-4">
                <Button onClick={() => navigate('/dashboard')} className="flex-1">
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => setStep('info')}>
                  View 2FA Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6" />
              <div>
                <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
                <Alert className="mt-2">
                  <AlertDescription className="text-xs">
                    <strong>Note:</strong> 2FA is currently optional. You can set it up, but it won't be required during login yet.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert className="mb-4">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {isEnabled ? (
              <div className="space-y-4">
                <Alert>
                  <Shield className="w-4 h-4" />
                  <AlertDescription>
                    <strong>2FA is currently enabled</strong> on your account. You'll need to enter a code from your authenticator app when logging in.
                  </AlertDescription>
                </Alert>

                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-semibold mb-2">Disable 2FA</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    To disable 2FA, enter a code from your authenticator app to confirm.
                  </p>
                  <form onSubmit={handleDisable2FA} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Enter 2FA Code
                      </label>
                      <InputOTP
                        maxLength={6}
                        value={verificationToken}
                        onChange={setVerificationToken}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={loading || verificationToken.length !== 6}
                      loading={loading}
                    >
                      Disable 2FA
                    </Button>
                  </form>
                </div>
              </div>
            ) : step === 'info' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">What is 2FA?</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Two-Factor Authentication adds an extra layer of security to your account. 
                    After entering your OTP, you'll also need to enter a code from your authenticator app.
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    How to Set Up 2FA
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                    <li>Click "Enable 2FA" below</li>
                    <li>Scan the QR code with an authenticator app:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>Google Authenticator</li>
                        <li>Microsoft Authenticator</li>
                        <li>Authy</li>
                        <li>Any TOTP-compatible app</li>
                      </ul>
                    </li>
                    <li>Enter the 6-digit code from your app to verify</li>
                    <li>2FA will be enabled on your account</li>
                  </ol>
                </div>

                <Button onClick={handleSetup2FA} disabled={loading} loading={loading} className="w-full">
                  Enable 2FA
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Step 1: Scan QR Code</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Open your authenticator app and scan this QR code:
                  </p>
                  <div className="flex justify-center p-4 bg-white border rounded-lg">
                    {qrCode ? (
                      <img src={qrCode} alt="2FA QR Code" className="w-64 h-64" />
                    ) : (
                      <Spinner className="size-8" />
                    )}
                  </div>
                  {secret && (
                    <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
                      <p className="font-medium mb-1">Can't scan? Enter this code manually:</p>
                      <code className="text-gray-700">{secret}</code>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Step 2: Verify Setup</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter the 6-digit code from your authenticator app to complete setup:
                  </p>
                  <form onSubmit={handleVerify2FA} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Enter 2FA Code
                      </label>
                      <InputOTP
                        maxLength={6}
                        value={verificationToken}
                        onChange={setVerificationToken}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setStep('info');
                          setQrCode('');
                          setSecret('');
                          setVerificationToken('');
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading || verificationToken.length !== 6}
                        loading={loading}
                        className="flex-1"
                      >
                        Verify & Enable
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
