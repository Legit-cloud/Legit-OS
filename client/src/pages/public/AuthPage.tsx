import { useState, type FormEvent, useRef, useEffect } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, X, Eye, EyeOff, Upload, Check } from 'lucide-react';
import { Button, Field, Logo, ThemeToggle } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import type { User } from '../../lib/types';
import { useAuth } from '../../store/auth';

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { token, user, setSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', rememberMe: false, idDocument: '', facePicture: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [step, setStep] = useState<'form' | 'document' | 'camera'>('form');
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success'>('idle');

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please allow permissions.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        setForm(f => ({ ...f, facePicture: canvasRef.current!.toDataURL('image/jpeg') }));
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        setCameraActive(false);
      }
    }
  };

  const destination = (u: User) => {
    const next = params.get('next');
    if (next?.startsWith('/admin') && u.role !== 'ADMIN') return '/app';
    return next ?? (u.role === 'ADMIN' ? '/admin' : '/app');
  };

  if (token && user) return <Navigate to={destination(user)} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === 'register') {
      if (step === 'form') {
        if (form.password !== form.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        setError('');
        setStep('document');
        return;
      }
      if (step === 'document') {
        if (!form.idDocument) {
          setError('Please upload an ID document');
          return;
        }
        setError('');
        setStep('camera');
        return;
      }
      if (step === 'camera') {
        if (!form.facePicture) {
          setError('Please capture your face photo');
          return;
        }
      }
    }

    setLoading(true);
    setError('');

    if (mode === 'register' && step === 'camera') {
      setVerificationStatus('verifying');
      await new Promise(resolve => setTimeout(resolve, 2000));
      setVerificationStatus('success');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    try {
      const body = mode === 'login' ? { email: form.email, password: form.password } : { ...form, phone: form.phone || undefined };
      const res = await api<{ token: string; user: User }>(`/auth/${mode}`, { body });
      setSession(res.token, res.user);
      navigate(destination(res.user), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute left-1/2 top-1/3 h-80 w-[560px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-cyan-600 dark:text-slate-300">
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>
        <ThemeToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass relative w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-bold">{mode === 'login' ? 'Sign in to L.E.G.I.T OS' : 'Join the Hub'}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === 'login' ? 'Access your terminal, bookings and classrooms.' : 'Create your free Pay-As-You-Go membership in seconds.'}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'register' && step === 'document' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">ID Verification</label>
                <p className="text-sm text-slate-500 mb-4">Upload a valid ID (NIN, Driver's License, etc.)</p>
                {!form.idDocument ? (
                  <label className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800 cursor-pointer">
                    <Upload className="mb-3 h-8 w-8 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Click to upload document</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setForm(f => ({ ...f, idDocument: reader.result as string }));
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                ) : (
                  <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <img src={form.idDocument} alt="ID Document" className="h-64 w-full object-cover" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, idDocument: '' }))} className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"><X className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
              {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 animate-in fade-in" role="alert">{error}</p>}
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('form')}>Back</Button>
                <Button type="submit" className="flex-1">Next: Face Scan</Button>
              </div>
            </div>
          ) : mode === 'register' && step === 'camera' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Face Verification</label>
                <p className="text-sm text-slate-500 mb-4">We will verify this matches your uploaded ID.</p>
                {!form.facePicture && !cameraActive && (
                  <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800 cursor-pointer" onClick={startCamera}>
                    <Camera className="mb-3 h-8 w-8 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Click to start camera</span>
                  </div>
                )}
                {cameraActive && (
                  <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-black dark:border-slate-700 shadow-lg">
                    <video ref={videoRef} autoPlay playsInline muted className="h-64 w-full object-cover" />
                    <button type="button" onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:bg-cyan-600 transition-colors">Capture Photo</button>
                    <button type="button" onClick={() => { setCameraActive(false); (videoRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop()); }} className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"><X className="h-4 w-4" /></button>
                  </div>
                )}
                {form.facePicture && !cameraActive && (
                  <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <img src={form.facePicture} alt="Face scan" className="h-64 w-full object-cover" />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-emerald-500/90 px-4 py-1.5 text-sm font-medium text-white shadow-lg backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in">
                      <Check className="h-4 w-4" />
                      Face Captured Successfully
                    </div>
                    <button type="button" onClick={() => setForm(f => ({ ...f, facePicture: '' }))} className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"><X className="h-4 w-4" /></button>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('document')} disabled={loading || verificationStatus !== 'idle'}>Back</Button>
                <Button 
                  type="submit" 
                  className={`flex-1 ${verificationStatus === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`} 
                  loading={loading || verificationStatus === 'verifying'}
                  disabled={verificationStatus === 'success'}
                >
                  {verificationStatus === 'verifying' ? 'Verifying Identity...' : 
                   verificationStatus === 'success' ? 'Verification Successful!' : 
                   'Verify & Register'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {mode === 'register' && (
                <>
                  <Field label="Full name"><input className="field" required minLength={2} value={form.fullName} onChange={set('fullName')} autoComplete="name" /></Field>
                  <Field label="Phone (optional)"><input className="field" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="+234…" /></Field>
                </>
              )}
              <Field label="Email"><input className="field" type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></Field>
              <Field label="Password" hint={mode === 'register' ? 'At least 8 characters.' : undefined}>
                <div className="relative">
                  <input className="field pr-10" type={showPassword ? 'text' : 'password'} required minLength={mode === 'register' ? 8 : 1} value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              {mode === 'register' && (
                <Field label="Confirm Password">
                  <div className="relative">
                    <input className="field pr-10" type={showConfirmPassword ? 'text' : 'password'} required minLength={8} value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
              )}
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="rememberMe" className="h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500" checked={form.rememberMe} onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })} />
                <label htmlFor="rememberMe" className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer">Remember me</label>
              </div>
              {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 animate-in fade-in" role="alert">{error}</p>}
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                {mode === 'login' ? 'Sign in' : 'Next Step'}
              </Button>
            </>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === 'login' ? (
            <>New here? <Link to="/register" className="font-semibold text-cyan-600 hover:underline">Join the Hub</Link></>
          ) : (
            <>Already a member? <Link to="/login" className="font-semibold text-cyan-600 hover:underline">Sign in</Link></>
          )}
        </p>
        {mode === 'login' && import.meta.env.DEV && (
          <p className="mt-4 rounded-2xl border border-dashed border-cyan-500/40 p-3 font-mono text-[11px] leading-relaxed text-slate-500">
            demo@legithub.com / Demo@12345<br />admin@legithub.com / Admin@12345
          </p>
        )}
      </motion.div>
    </div>
  );
}
