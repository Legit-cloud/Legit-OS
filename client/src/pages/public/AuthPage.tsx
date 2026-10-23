import { useState, type FormEvent, useRef, useEffect } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  X,
  Eye,
  EyeOff,
  Upload,
  Check,
  Mail,
  ShieldCheck,
  FileCheck,
  RefreshCw,
  AlertCircle,
  AlertOctagon,
  Clock,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { Button, Field, Logo, cn } from '../../components/ui';
import { ThemeToggle } from '../../components/ThemeToggle';
import { api, errorMessage } from '../../lib/api';
import { useSocketEvent } from '../../lib/socket';
import type { User } from '../../lib/types';
import { useAuth } from '../../store/auth';
import { toast } from '../../store/toast';

const ID_TYPES = [
  { id: 'NIN', label: 'National ID / NIN Slip', hint: 'NIMC National Identification Number slip or card' },
  { id: 'DRIVERS_LICENSE', label: "Driver's License", hint: 'Federal Road Safety Corps license' },
  { id: 'PASSPORT', label: 'International Passport', hint: 'Data page of valid passport' },
  { id: 'VOTERS_CARD', label: "Voter's Card (PVC)", hint: 'INEC permanent voter card' },
  { id: 'STUDENT_WORK_ID', label: 'Student / Work ID', hint: 'Recognized tertiary school or corporate ID' },
];

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { token, user, setSession, setUser, clear } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    rememberMe: false,
    idType: 'NIN',
    idDocument: '',
    facePicture: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Camera & Biometrics
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Flow State
  const initialStep =
    mode === 'register' && (user?.status === 'PENDING_VERIFICATION' || user?.status === 'REJECTED' || params.get('pending') === '1')
      ? 'pending'
      : 'form';
  const [step, setStep] = useState<'form' | 'otp' | 'document' | 'camera' | 'pending'>(initialStep);

  // OTP State
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Polling check state for pending review
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [approvalCelebration, setApprovalCelebration] = useState(false);

  // Cleanup camera stream
  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch { }
      });
      setStream(null);
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch { }
    }
    setCameraActive(false);
    setCameraReady(false);
    setIsCameraLoading(false);
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream]);

  // OTP cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Keep step synced if user status changes to PENDING_VERIFICATION or REJECTED
  useEffect(() => {
    if (
      (user?.status === 'PENDING_VERIFICATION' || user?.status === 'REJECTED') &&
      step !== 'pending' &&
      step !== 'document' &&
      step !== 'camera'
    ) {
      setStep('pending');
    }
  }, [user?.status, step]);

  const destination = (_u?: User) => {
    const next = params.get('next');
    if (next && next.startsWith('/app')) return next;
    return '/app';
  };

  // Check immediately on mount if token exists
  useEffect(() => {
    if (!token) return;
    api<{ user: User }>('/auth/me')
      .then((res) => {
        setUser(res.user);
      })
      .catch(() => { });
  }, [token, setUser]);

  // Real-time server push when admin approves or rejects
  useSocketEvent('profile:changed', () => {
    manualCheckStatus();
  });

  // Polling while on pending screen
  useEffect(() => {
    if (step !== 'pending' && user?.status !== 'PENDING_VERIFICATION') return;
    if (!token) return;

    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await api<{ user: User }>('/auth/me');
        if (!active) return;
        if (res.user.status === 'ACTIVE') {
          setUser(res.user);
          setApprovalCelebration(true);
          toast.success('Identity Verified!', 'Welcome to L.E.G.I.T Innovation Hub.');
          setTimeout(() => {
            navigate(destination(res.user), { replace: true });
          }, 1800);
        } else if (res.user.status === 'REJECTED') {
          setUser(res.user);
        }
      } catch {
        // network silent retry
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [step, user?.status, token, navigate, setUser]);

  const manualCheckStatus = async () => {
    if (!token || isCheckingStatus) return;
    setIsCheckingStatus(true);
    try {
      const res = await api<{ user: User }>('/auth/me');
      setUser(res.user);
      if (res.user.status === 'ACTIVE') {
        setApprovalCelebration(true);
        toast.success('Identity Verified!', 'Welcome to L.E.G.I.T Innovation Hub.');
        setTimeout(() => {
          navigate(destination(res.user), { replace: true });
        }, 1500);
      } else if (res.user.status === 'REJECTED') {
        toast.error('Application Update', res.user.verificationNote || 'Verification was rejected.');
      } else {
        toast.info('Review in Progress', 'Security administration is currently reviewing your documents.');
      }
    } catch (err) {
      toast.error('Check failed', errorMessage(err));
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraLoading(true);
    setCameraReady(false);
    try {
      if (stream) {
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch { }
        });
        setStream(null);
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Your browser does not support webcam capture. Please upload a clear photo instead.');
      }

      let s: MediaStream;
      try {
        // Attempt front-facing webcam with ideal dimensions
        s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err: any) {
        console.warn('Strict camera constraints failed, trying basic video:', err);
        // Fallback to basic video without restrictive constraints
        s = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream(s);
      setCameraActive(true);
      setError('');

      // Directly configure video element if mounted
      if (videoRef.current) {
        const vid = videoRef.current;
        vid.muted = true;
        vid.defaultMuted = true;
        vid.playsInline = true;
        vid.setAttribute('playsinline', 'true');
        vid.setAttribute('muted', 'true');
        vid.srcObject = s;
        vid.onloadedmetadata = () => {
          vid.play().then(() => setCameraReady(true)).catch(() => { });
        };
        vid.play().then(() => setCameraReady(true)).catch(() => { });
      }
    } catch (err: any) {
      console.error('Camera startup error:', err);
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.toLowerCase().includes('denied');
      const isNotFound = err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError';
      setCameraError(
        isDenied
          ? 'Camera permission was blocked. Please click the camera icon in your browser URL bar to allow camera access, or upload a clear selfie photo below.'
          : isNotFound
            ? 'No camera was found on your device. You can upload a clear selfie photo instead.'
            : err?.message || 'Could not access camera. You can upload a clear selfie photo instead.'
      );
      setCameraActive(false);
    } finally {
      setIsCameraLoading(false);
    }
  };

  // Keep stream synced to videoRef and ensure autoplay plays
  useEffect(() => {
    if (videoRef.current && stream) {
      const vid = videoRef.current;
      vid.muted = true;
      vid.defaultMuted = true;
      vid.playsInline = true;
      vid.setAttribute('playsinline', 'true');
      vid.setAttribute('muted', 'true');
      if (vid.srcObject !== stream) {
        vid.srcObject = stream;
      }
      vid.onloadedmetadata = () => {
        vid.play().then(() => setCameraReady(true)).catch((e) => console.warn('Metadata play error:', e));
      };
      vid.play().then(() => setCameraReady(true)).catch((e) => console.warn('Play error:', e));
    }
  }, [stream]);

  // Auto-start camera when entering Step 4
  useEffect(() => {
    if (step === 'camera' && !form.facePicture && !stream && !cameraActive) {
      startCamera();
    }
    if (step !== 'camera') {
      stopCameraStream();
    }
  }, [step]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) {
      setError('Camera video feed is not ready.');
      return;
    }

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;

    if (w === 0 || h === 0 || video.readyState < 2) {
      setError('Please wait a moment for the live camera stream to initialize.');
      return;
    }

    // Capture using offscreen canvas to guarantee reliable encoding
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror horizontally so the captured snapshot matches what the user saw in the live preview
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setForm((f) => ({ ...f, facePicture: dataUrl }));
    stopCameraStream();
    setError('');
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Document file size must be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((f) => ({ ...f, idDocument: reader.result as string }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo file size must be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((f) => ({ ...f, facePicture: reader.result as string }));
      stopCameraStream();
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const nextParam = params.get('next');
  if (mode === 'login' && nextParam && nextParam.startsWith('/admin')) {
    return <Navigate to="/admin/login" replace />;
  }

  // If already logged in and active, navigate to destination
  if (token && user && user.status === 'ACTIVE') {
    return <Navigate to={destination(user)} replace />;
  }

  async function handleResendOtp() {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError('');
    try {
      await api<{ ok: boolean; message: string }>('/auth/send-otp', {
        body: { email: form.email },
      });
      setResendCooldown(60);
      setOtp('');
      toast.success('Code Sent', 'Please check your email inbox.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (mode === 'register') {
      // STEP 1: Registration Form
      if (step === 'form') {
        if (!form.fullName.trim() || !form.email.trim() || !form.password) {
          setError('Please fill in all required fields');
          return;
        }
        if (form.password.length < 8) {
          setError('Password must be at least 8 characters');
          return;
        }
        if (form.password !== form.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        setLoading(true);
        setError('');
        try {
          await api<{ ok: boolean; message: string }>('/auth/send-otp', {
            body: { email: form.email },
          });
          setResendCooldown(45);
          setStep('otp');
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setLoading(false);
        }
        return;
      }

      // STEP 2: Email OTP Verification
      if (step === 'otp') {
        if (otp.trim().length !== 6) {
          setError('Please enter the 6-digit verification code');
          return;
        }
        setLoading(true);
        setError('');
        try {
          await api<{ ok: boolean; verified: boolean }>('/auth/verify-otp', {
            body: { email: form.email, code: otp.trim() },
          });
          setStep('document');
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setLoading(false);
        }
        return;
      }

      // STEP 3: Identification Document Upload
      if (step === 'document') {
        if (!form.idDocument) {
          setError('Please upload a valid identification document to proceed.');
          return;
        }
        setError('');
        setStep('camera');
        return;
      }

      // STEP 4: Live Face Capture & Registration Submission
      if (step === 'camera') {
        if (!form.facePicture) {
          setError('Please capture or upload your live face photo.');
          return;
        }
      }
    }

    // Final Submission: Login or Register
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const res = await api<{ token: string; user: User }>('/auth/login', {
          body: { email: form.email, password: form.password },
        });
        setSession(res.token, res.user);
        if (res.user.status === 'PENDING_VERIFICATION' || res.user.status === 'REJECTED') {
          setStep('pending');
        } else {
          navigate(destination(res.user), { replace: true });
        }
      } else {
        if (token && user?.status === 'REJECTED') {
          // Re-submitting revised documents while logged in
          const res = await api<{ ok: boolean; user: User }>('/auth/resubmit-verification', {
            body: {
              idType: form.idType,
              idDocument: form.idDocument,
              facePicture: form.facePicture,
            },
          });
          setUser(res.user);
          setStep('pending');
          toast.success('Application Resubmitted', 'Your revised documents have been submitted for review.');
        } else {
          // Register with ID and Face Picture
          const res = await api<{ token: string; user: User; pendingVerification?: boolean }>('/auth/register', {
            body: {
              fullName: form.fullName,
              email: form.email,
              phone: form.phone || undefined,
              password: form.password,
              idType: form.idType,
              idDocument: form.idDocument,
              facePicture: form.facePicture,
            },
          });
          setSession(res.token, res.user);
          setStep('pending');
          toast.success('Registration Submitted', 'Your identity verification is being reviewed.');
        }
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const activeIdTypeLabel = ID_TYPES.find((t) => t.id === form.idType)?.label || form.idType;

  const isSplitLayout = (mode === 'login' || step === 'form') && step !== 'pending';

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-16 bg-slate-50 text-slate-900 dark:bg-[#07090e] dark:text-slate-100 transition-colors duration-200">
      <div className="light-mesh dark:scanline-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="absolute left-1/2 top-1/3 h-80 w-[600px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[140px] pointer-events-none dark:bg-blue-500/15" />

      <div className="absolute left-4 right-4 top-4 flex items-center justify-between z-20 max-w-6xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition">
          <ArrowLeft className="h-4 w-4" /> Back to hub
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {step === 'pending' && token && (
            <button
              onClick={() => {
                clear();
                setStep('form');
                navigate('/login', { replace: true });
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          )}
        </div>
      </div>

      <div className={cn("relative z-10 w-full", isSplitLayout ? "max-w-5xl grid lg:grid-cols-[1fr_1.1fr] gap-8 items-center" : "max-w-lg mx-auto")}>
        {isSplitLayout && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:flex flex-col justify-between h-full rounded-3xl overflow-hidden border border-white/10 relative p-8 shadow-2xl min-h-[580px]"
          >
            <img
              src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80"
              alt="African software developers collaborating at L.E.G.I.T Hub in Ibadan"
              className="absolute inset-0 h-full w-full object-cover brightness-[0.55] contrast-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/60 to-transparent" />
            <div className="relative z-10">
              <span className="pill bg-[#0d111a]/80 backdrop-blur-md border-cyan-400/30 text-cyan-300">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> Secure Terminal Gateway
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white leading-snug">
                Ibadan's Launchpad for Technical Founders
              </h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Join 550+ innovators, GPU compute clusters, and startup cohorts scaling digital products across Africa.
              </p>
            </div>

            <div className="relative z-10 space-y-3 pt-6 border-t border-white/10 font-mono text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Biometric ID & KYC Verification</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                <span>24/7 Workspace & High-Performance Lab Access</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                <span>Direct Investor Readiness & Placement</span>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bento-card p-6 sm:p-8 w-full">
          <Logo />

        {/* Header Title */}
        {mode === 'login' ? (
          <>
            <h1 className="mt-6 font-display text-2xl font-bold">Sign in to L.E.G.I.T OS</h1>
            <p className="mt-1 text-sm text-slate-500">Access your terminal, bookings and classrooms.</p>
          </>
        ) : step === 'pending' ? null : (
          <>
            <h1 className="mt-6 font-display text-2xl font-bold">
              {step === 'form' && 'Join the Hub'}
              {step === 'otp' && 'Email Verification'}
              {step === 'document' && 'Valid Identification'}
              {step === 'camera' && 'Live Biometric Scan'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {step === 'form' && 'Create your free Pay-As-You-Go membership in seconds.'}
              {step === 'otp' && 'Verify your email address with the 6-digit security code.'}
              {step === 'document' && 'Upload a valid government-issued photo ID for security clearance.'}
              {step === 'camera' && 'Perform a live face verification snapshot to match against your ID.'}
            </p>
          </>
        )}

        {/* 4-Step Registration Progress Indicator */}
        {mode === 'register' && step !== 'pending' && (
          <div className="mt-5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span className={step === 'form' ? 'text-cyan-600 dark:text-cyan-400' : ''}>1. Account</span>
              <span className={step === 'otp' ? 'text-cyan-600 dark:text-cyan-400' : ''}>2. OTP</span>
              <span className={step === 'document' ? 'text-cyan-600 dark:text-cyan-400' : ''}>3. ID Upload</span>
              <span className={step === 'camera' ? 'text-cyan-600 dark:text-cyan-400' : ''}>4. Face Scan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 flex-1 rounded-full bg-cyan-500" />
              <div className={cn('h-1.5 flex-1 rounded-full transition-all', ['otp', 'document', 'camera'].includes(step) ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-white/10')} />
              <div className={cn('h-1.5 flex-1 rounded-full transition-all', ['document', 'camera'].includes(step) ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-white/10')} />
              <div className={cn('h-1.5 flex-1 rounded-full transition-all', step === 'camera' ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-white/10')} />
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <AnimatePresence mode="wait">
            {/* ─── STEP 2: EMAIL OTP ────────────────────────────────────────────── */}
            {mode === 'register' && step === 'otp' && (
              <motion.div key="step-otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 mb-3 shadow-inner">
                    <Mail className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">Check your inbox</h3>
                  <p className="mt-1 text-xs text-slate-500">We sent a 6-digit verification code to</p>
                  <p className="font-semibold text-xs text-cyan-600 dark:text-cyan-400 truncate mt-0.5">{form.email}</p>
                </div>

                <div>
                  <label className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(val);
                      if (val.length === 6) setError('');
                    }}
                    placeholder="000000"
                    className="field text-center font-mono text-3xl font-bold tracking-[0.4em] py-3.5 focus:border-cyan-500"
                  />
                </div>

                {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 animate-in fade-in" role="alert">{error}</p>}

                <Button type="submit" className="w-full" size="lg" disabled={otp.length !== 6 || loading} loading={loading}>
                  Verify & Continue
                </Button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('form');
                      setError('');
                    }}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition"
                  >
                    &larr; Change email
                  </button>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleResendOtp}
                    className="font-semibold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 disabled:opacity-50 transition"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 3: ID DOCUMENT UPLOAD ──────────────────────────────────── */}
            {mode === 'register' && step === 'document' && (
              <motion.div key="step-doc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-cyan-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Physical Hub Security Requirement</p>
                    <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                      To safeguard hardware and grant high-speed internet access, each member must register with an authentic government ID.
                    </p>
                  </div>
                </div>

                <Field label="Identification Type">
                  <select
                    className="field bg-transparent"
                    value={form.idType}
                    onChange={(e) => setForm({ ...form, idType: e.target.value })}
                  >
                    {ID_TYPES.map((t) => (
                      <option key={t.id} value={t.id} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Upload {activeIdTypeLabel}
                    </label>
                    <span className="text-[11px] text-slate-400">JPG, PNG, WEBP (Max 5MB)</span>
                  </div>

                  {!form.idDocument ? (
                    <label className="group flex h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 transition-all hover:border-cyan-500 hover:bg-cyan-500/5 dark:border-slate-700 dark:bg-slate-900/50 cursor-pointer">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                        <Upload className="h-6 w-6" />
                      </div>
                      <span className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Click to select or drag document
                      </span>
                      <span className="mt-1 text-xs text-slate-400">
                        Full card or slip must be clear and legible
                      </span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        className="hidden"
                        onChange={handleDocumentUpload}
                      />
                    </label>
                  ) : (
                    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-black/40 shadow-lg">
                      <img
                        src={form.idDocument}
                        alt="Uploaded ID Document"
                        className="h-56 w-full object-contain bg-slate-950/80"
                      />
                      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-cyan-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md shadow-md">
                        <FileCheck className="h-3.5 w-3.5" />
                        {activeIdTypeLabel} Attached
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, idDocument: '' }))}
                        className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white hover:bg-rose-600 transition"
                        title="Remove Document"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3 text-[11px] text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    PLEASE ENSURE..
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <Check className="h-3.5 w-3.5 text-cyan-500" /> Name matches: <strong>{form.fullName}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <Check className="h-3.5 w-3.5 text-cyan-500" /> Photo & document number are unobstructed
                  </div>
                </div>

                {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 animate-in fade-in" role="alert">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStep('otp');
                      setError('');
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={!form.idDocument}
                  >
                    Next: Face Scan
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 4: LIVE FACE VERIFICATION ──────────────────────────────── */}
            {mode === 'register' && step === 'camera' && (
              <motion.div key="step-cam" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-cyan-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Live Biometric Matching</p>
                    <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                      Center your face in good light. Our administration matches this live photo against your uploaded {activeIdTypeLabel}.
                    </p>
                  </div>
                </div>

                {/* Viewfinder / Capture Box */}
                <div className="relative">
                  {!form.facePicture ? (
                    <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-500/80 bg-slate-950 shadow-2xl min-h-[350px] flex items-center justify-center">
                      {/* Live Video Feed */}
                      <video
                        ref={(el) => {
                          (videoRef as any).current = el;
                          if (el && stream) {
                            el.muted = true;
                            el.defaultMuted = true;
                            el.playsInline = true;
                            el.setAttribute('playsinline', 'true');
                            el.setAttribute('muted', 'true');
                            if (el.srcObject !== stream) {
                              el.srcObject = stream;
                            }
                            el.play().then(() => setCameraReady(true)).catch(() => { });
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        style={{ transform: 'scaleX(-1)' }}
                        onLoadedMetadata={() => {
                          if (videoRef.current) {
                            videoRef.current.play().then(() => setCameraReady(true)).catch(() => { });
                          }
                        }}
                        onPlaying={() => setCameraReady(true)}
                        className={cn(
                          'h-84 w-full object-cover bg-slate-950 transition-opacity duration-300',
                          cameraActive && cameraReady ? 'opacity-100' : 'opacity-0'
                        )}
                      />

                      {/* Loading State Overlay */}
                      {isCameraLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center z-20">
                          <div className="relative mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            <RefreshCw className="h-7 w-7 animate-spin text-cyan-400" />
                            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-ping" />
                          </div>
                          <h4 className="font-semibold text-sm text-white">Starting Live Camera...</h4>
                          <p className="mt-1 max-w-xs text-xs text-slate-400">
                            Please allow camera permissions if prompted by your browser to scan your face.
                          </p>
                        </div>
                      )}

                      {/* Error or Denied State Overlay */}
                      {cameraError && !isCameraLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center z-20">
                          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <AlertCircle className="h-7 w-7 text-rose-400" />
                          </div>
                          <h4 className="font-semibold text-sm text-white">Camera Access Required</h4>
                          <p className="mt-1 max-w-xs text-xs text-rose-300/90 leading-relaxed">
                            {cameraError}
                          </p>
                          <div className="mt-4 flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                            <Button type="button" onClick={startCamera} size="sm" className="flex-1">
                              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry Camera
                            </Button>
                            <label className="flex-1 inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-semibold text-white cursor-pointer transition border border-white/10">
                              <Upload className="h-3.5 w-3.5 mr-1 text-cyan-400" /> Upload Selfie
                              <input type="file" accept="image/*" className="hidden" onChange={handleSelfieUpload} />
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Inactive State (if manually stopped without error) */}
                      {!cameraActive && !isCameraLoading && !cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center z-20">
                          <div className="relative mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            <Camera className="h-7 w-7 text-cyan-400" />
                          </div>
                          <h4 className="font-semibold text-sm text-white">Ready for Face Scan</h4>
                          <p className="mt-1 max-w-xs text-xs text-slate-400">
                            Click below to open your camera and capture your face snapshot.
                          </p>
                          <div className="mt-4 flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                            <Button type="button" onClick={startCamera} size="sm" className="flex-1">
                              <Camera className="h-3.5 w-3.5 mr-1" /> Open Camera
                            </Button>
                            <label className="flex-1 inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-semibold text-white cursor-pointer transition border border-white/10">
                              <Upload className="h-3.5 w-3.5 mr-1 text-slate-300" /> Upload File
                              <input type="file" accept="image/*" className="hidden" onChange={handleSelfieUpload} />
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Active Camera Viewfinder Overlays (shown when camera is running) */}
                      {cameraActive && !cameraError && (
                        <>
                          {/* Biometric Oval Guide Overlay */}
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="relative h-60 w-44 rounded-[50%] border-2 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.6)]">
                              {/* Scanning Beam Animation */}
                              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_12px_rgba(6,182,212,1)] animate-pulse" />
                              {/* Biometric Center Crosshair */}
                              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                <div className="h-6 w-0.5 bg-cyan-400" />
                                <div className="h-0.5 w-6 bg-cyan-400 absolute" />
                              </div>
                            </div>
                          </div>

                          {/* HUD Corner Framing Brackets */}
                          <div className="pointer-events-none absolute inset-4">
                            <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-cyan-400" />
                            <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-cyan-400" />
                            <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-cyan-400" />
                            <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-cyan-400" />
                          </div>

                          {/* Live Status Badge */}
                          <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md border border-white/10 shadow-md">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                            LIVE CAM · Fit Face in Oval
                          </div>

                          {/* Close / Pause Camera Button */}
                          <button
                            type="button"
                            onClick={stopCameraStream}
                            className="absolute right-3 top-3 rounded-full bg-black/70 p-1.5 text-white hover:bg-rose-600 transition backdrop-blur-md"
                            title="Turn off camera"
                          >
                            <X className="h-4 w-4" />
                          </button>

                          {/* Capture Trigger Action Bar */}
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="group flex items-center gap-2 rounded-full bg-blue-600 px-7 py-2.5 font-bold text-sm text-white shadow-md shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer border border-white/20"
                            >
                              <Camera className="h-4 w-4 group-hover:scale-110 transition-transform" /> Snap Face Photo
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    /* Captured Photo Preview */
                    <div className="space-y-3">
                      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-black/40 shadow-lg">
                        <img
                          src={form.facePicture}
                          alt="Face snapshot"
                          className="h-64 w-full object-contain bg-slate-950"
                        />
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3.5 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
                          <Check className="h-3.5 w-3.5" /> Biometric Photo Verified
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, facePicture: '' }));
                            startCamera();
                          }}
                          className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white hover:bg-rose-600 transition"
                          title="Retake Photo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Verification Comparison Mini Card */}
                      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 dark:border-white/10 p-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                          <img src={form.idDocument} alt="ID preview" className="h-10 w-14 rounded object-cover border" />
                          <div className="min-w-0 text-[11px]">
                            <p className="font-semibold truncate">{activeIdTypeLabel}</p>
                            <span className="text-emerald-500 font-medium">Attached</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <img src={form.facePicture} alt="Selfie preview" className="h-10 w-10 rounded-full object-cover border" />
                          <div className="min-w-0 text-[11px]">
                            <p className="font-semibold truncate">Live Selfie</p>
                            <span className="text-emerald-500 font-medium">Captured</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, facePicture: '' }));
                            startCamera();
                          }}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-500 transition"
                        >
                          <RotateCcw className="h-3 w-3" /> Retake selfie photo
                        </button>
                      </div>
                    </div>
                  )}

                  {!form.facePicture && (
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-500" /> Center face in oval with good lighting
                      </span>
                      <label className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer">
                        <Upload className="h-3 w-3" /> Upload selfie instead
                        <input type="file" accept="image/*" className="hidden" onChange={handleSelfieUpload} />
                      </label>
                    </div>
                  )}
                </div>

                {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 animate-in fade-in" role="alert">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={loading}
                    onClick={() => {
                      stopCameraStream();
                      setStep('document');
                      setError('');
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={!form.facePicture || loading}
                    loading={loading}
                  >
                    Submit Application
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 5: APPLICATION UNDER REVIEW (PENDING) ─────────────────── */}
            {mode === 'register' && step === 'pending' && (
              <motion.div key="step-pending" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center">
                {approvalCelebration ? (
                  <div className="py-8 space-y-3 animate-in zoom-in-95 duration-500">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                      Identity Approved!
                    </h2>
                    <p className="text-sm text-slate-500">
                      Welcome to L.E.G.I.T Innovation Hub. Redirecting to your dashboard…
                    </p>
                  </div>
                ) : user?.status === 'REJECTED' ? (
                  /* ─── DEDICATED REJECTION & REVISION SCREEN ──────────────── */
                  <>
                    <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/30 shadow-lg">
                      <AlertOctagon className="h-8 w-8" />
                    </div>

                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Verification Declined · Action Required
                      </div>
                      <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                        Application Needs Revision
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                        Your identity verification was reviewed by administration, but the submitted documents could not be approved.
                      </p>
                    </div>

                    {/* Prominent Reviewer Feedback Card */}
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-left space-y-2.5">
                      <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        Admin Feedback & Rejection Reason
                      </div>
                      <div className="rounded-xl bg-white/80 dark:bg-black/50 p-3.5 border border-rose-500/20 font-medium text-slate-900 dark:text-white text-xs leading-relaxed shadow-sm">
                        "{user.verificationNote || 'ID document or live selfie photo did not meet quality or security guidelines.'}"
                      </div>
                      <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 leading-relaxed">
                        Please upload an unobstructed, clear photo of your valid ID and ensure your live face snapshot is taken with direct lighting and no blur.
                      </p>
                    </div>

                    {/* Summary Card with previous submission */}
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50 p-4 text-left space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Previously Submitted Documents
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {user.idDocument && (
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-1">Uploaded ID</span>
                            <img
                              src={user.idDocument}
                              alt="Submitted ID"
                              className="h-20 w-full rounded-lg object-cover border border-slate-200 dark:border-white/10"
                            />
                          </div>
                        )}
                        {user.facePicture && (
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-1">Face Capture</span>
                            <img
                              src={user.facePicture}
                              alt="Submitted Selfie"
                              className="h-20 w-full rounded-lg object-cover border border-slate-200 dark:border-white/10"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        type="button"
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            fullName: user?.fullName || f.fullName,
                            email: user?.email || f.email,
                            phone: user?.phone || f.phone,
                            idType: user?.idType || f.idType || 'NIN',
                            idDocument: '',
                            facePicture: '',
                          }));
                          setStep('document');
                        }}
                        className="w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold shadow-lg"
                        size="lg"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Re-upload Documents & Retake Photo
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          clear();
                          setStep('form');
                          navigate('/login', { replace: true });
                        }}
                        className="text-xs text-slate-500"
                      >
                        Sign in to another account
                      </Button>
                    </div>
                  </>
                ) : (
                  /* ─── PENDING REVIEW SCREEN ──────────────────────────────── */
                  <>
                    <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30 shadow-inner">
                      <Clock className="h-8 w-8 animate-pulse" />
                    </div>

                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                        Application Under Review
                      </div>
                      <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                        Review in Progress
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                        Thank you, <strong>{user?.fullName || form.fullName}</strong>. Your identification document and live face snapshot have been securely received.
                      </p>
                    </div>

                    {/* Summary Card */}
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50 p-4 text-left space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Submitted Credentials
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Registered Email</span>
                          <span className="font-medium text-slate-700 dark:text-slate-200 truncate block">
                            {user?.email || form.email}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Document Type</span>
                          <span className="font-medium text-slate-700 dark:text-slate-200 block">
                            {user?.idType || form.idType}
                          </span>
                        </div>
                      </div>

                      {/* Document Thumbnails Preview */}
                      {(user?.idDocument || form.idDocument) && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-1">ID Document</span>
                            <img
                              src={user?.idDocument || form.idDocument}
                              alt="Submitted ID"
                              className="h-20 w-full rounded-lg object-cover border border-slate-200 dark:border-white/10"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-1">Live Face Scan</span>
                            <img
                              src={user?.facePicture || form.facePicture}
                              alt="Submitted Selfie"
                              className="h-20 w-full rounded-lg object-cover border border-slate-200 dark:border-white/10"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-left text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                      <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-cyan-500" /> Confirmation Email Sent
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        We sent an application receipt confirmation to your email. Once approved by our team, you will receive an activation email and this screen will immediately unlock!
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        type="button"
                        onClick={manualCheckStatus}
                        className="w-full"
                        variant="primary"
                        loading={isCheckingStatus}
                      >
                        <RefreshCw className={cn('h-4 w-4 mr-2', isCheckingStatus && 'animate-spin')} />
                        Check Approval Status
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          clear();
                          setStep('form');
                          navigate('/login', { replace: true });
                        }}
                        className="text-xs text-slate-500"
                      >
                        Sign in to another account
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ─── STEP 1: INITIAL CREDENTIALS FORM ───────────────────────────── */}
            {((mode === 'login') || (mode === 'register' && step === 'form')) && (
              <motion.div key="step-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {mode === 'register' && (
                  <>
                    <Field label="Full name">
                      <input
                        className="field"
                        required
                        minLength={2}
                        value={form.fullName}
                        onChange={set('fullName')}
                        autoComplete="name"
                        placeholder="John Doe"
                      />
                    </Field>
                    <Field label="Phone (optional)">
                      <input
                        className="field"
                        value={form.phone}
                        onChange={set('phone')}
                        autoComplete="tel"
                        placeholder="+234 800 000 0000"
                      />
                    </Field>
                  </>
                )}

                <Field label="Email">
                  <input
                    className="field"
                    type="email"
                    required
                    value={form.email}
                    onChange={set('email')}
                    autoComplete="email"
                    placeholder="you@domain.com"
                  />
                </Field>

                <Field label="Password" hint={mode === 'register' ? 'At least 8 characters.' : undefined}>
                  <div className="relative">
                    <input
                      className="field pr-10"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={mode === 'register' ? 8 : 1}
                      value={form.password}
                      onChange={set('password')}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                {mode === 'register' && (
                  <Field label="Confirm Password">
                    <div className="relative">
                      <input
                        className="field pr-10"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={form.confirmPassword}
                        onChange={set('confirmPassword')}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    className="h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
                    checked={form.rememberMe}
                    onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
                  />
                  <label htmlFor="rememberMe" className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                    Remember me
                  </label>
                </div>

                {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 animate-in fade-in" role="alert">{error}</p>}

                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  {mode === 'login' ? 'Sign in' : 'Next Step'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {step !== 'pending' && (
          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>
                New here?{' '}
                <Link to="/register" className="font-semibold text-cyan-600 hover:underline">
                  Join the Hub
                </Link>
              </>
            ) : (
              <>
                Already a member?{' '}
                <Link to="/login" className="font-semibold text-cyan-600 hover:underline">
                  Sign in
                </Link>
              </>
            )}
          </p>
        )}

        {mode === 'login' && import.meta.env.DEV && (
          <p className="mt-4 rounded-2xl border border-dashed border-cyan-500/40 p-3 font-mono text-[11px] leading-relaxed text-slate-500">
            demo@legithub.com / Demo@12345
            <br />
            admin@legithub.com / Admin@12345
          </p>
        )}
        </motion.div>
      </div>
    </div>
  );
}
