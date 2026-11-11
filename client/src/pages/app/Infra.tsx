import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Armchair, Building2, ChevronLeft, ChevronRight, Clapperboard, Clock, Expand, Laptop, Minus, Plus, Presentation, Rocket, School, ShoppingBag, UtensilsCrossed, DoorClosed, X,
} from 'lucide-react';
import { Badge, Button, Card, Empty, Field, Loading, Modal, PageHeader, StatusBadge, cn } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useSocketEvent } from '../../lib/socket';
import { formatDateTime, naira } from '../../lib/format';
import type { Booking, CatalogItem, Invoice, LoungeOrder } from '../../lib/types';
import { toast } from '../../store/toast';

const FACILITY_ICONS: Record<string, typeof Building2> = {
  'Media Studio': Clapperboard,
  'Private Office': DoorClosed,
  'Conference Room': Presentation,
  Classroom: School,
};

const FACILITY_PHOTOS: Record<string, string> = {
  'Media Studio': '/media-studio-2.jpg',
  'Private Office': '/private-office-1.jpg',
  'Conference Room': '/conference-room-4.jpg',
  Classroom: '/classroom-2.jpg',
};

const FACILITY_GALLERIES: Record<string, string[]> = {
  'Media Studio': ['/media-studio-2.jpg', '/media-studio-3.jpg', '/media-studio-1.jpg'],
  'Private Office': ['/private-office-1.jpg', '/private-office-3.jpg', '/private-office-2.jpg', '/private-office-4.jpg'],
  'Conference Room': [
    '/conference-room-4.jpg',
    '/conference-room-2.jpg',
    '/conference-room-5.jpg',
    '/conference-room-1.jpg',
    '/conference-room-3.jpg',
  ],
  Classroom: ['/classroom-2.jpg', '/classroom-1.jpg', '/classroom-3.jpg'],
};

const DESK_PHOTO = '/coworkspace-3.jpg';
const DESK_PHOTOS = [
  '/coworkspace-3.jpg',
  '/coworkspace-1.jpg',
  '/coworkspace-2.jpg',
  '/coworkspace-4.jpg',
  '/coworkspace-5.jpg',
];

function FacilityCardMedia({
  facility,
  Icon,
  isFull,
  photos,
  onOpenLightbox,
}: {
  facility: CatalogItem;
  Icon: typeof Building2;
  isFull: boolean;
  photos: string[];
  onOpenLightbox: (index: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const hasMultiple = photos.length > 1;

  useEffect(() => {
    if (!hasMultiple || paused) return;
    const timer = window.setInterval(() => {
      setIdx((curr) => (curr + 1) % photos.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [hasMultiple, paused, photos.length]);

  return (
    <div
      className="relative h-44 w-full overflow-hidden bg-slate-900 cursor-pointer select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={() => onOpenLightbox(idx)}
      role="button"
      tabIndex={0}
      aria-label={`View ${facility.name} photos`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenLightbox(idx);
        }
      }}
    >
      {photos.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`${facility.name} ${i + 1}`}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-all duration-700 [@media(hover:hover)]:group-hover:scale-105',
            i === idx ? 'opacity-100 z-[1]' : 'opacity-0 z-0 pointer-events-none'
          )}
          loading="lazy"
        />
      ))}

      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent pointer-events-none" />

      <div className="absolute top-3 left-3 right-3 z-[3] flex items-center justify-between pointer-events-none">
        <span className="w-fit rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 p-2 text-white">
          <Icon className="h-4 w-4" />
        </span>
        {facility.availableUnits !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md',
              !isFull
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', !isFull ? 'bg-emerald-400' : 'bg-rose-400')} />
            {!isFull ? `${facility.availableUnits} open` : 'Booked'}
          </span>
        )}
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((curr) => (curr - 1 + photos.length) % photos.length);
            }}
            className="tap absolute left-2 top-1/2 z-[3] -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur-md border border-white/15 transition hover:bg-slate-950 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((curr) => (curr + 1) % photos.length);
            }}
            className="tap absolute right-2 top-1/2 z-[3] -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur-md border border-white/15 transition hover:bg-slate-950 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      <div className="absolute bottom-2.5 left-3 right-3 z-[3] flex items-center justify-between gap-2">
        {hasMultiple ? (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIdx(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === idx ? 'w-5 bg-[#155dfd]' : 'w-1.5 bg-white/60 hover:bg-white'
                )}
              />
            ))}
          </div>
        ) : (
          <span />
        )}

        <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/75 backdrop-blur-md border border-white/15 px-2 py-0.5 text-[10px] font-medium text-white">
          <Expand className="h-3 w-3" />
          <span>{hasMultiple ? `${idx + 1}/${photos.length} · Tap to view` : 'Tap to view'}</span>
        </span>
      </div>
    </div>
  );
}

function FacilityLightboxModal({
  lightbox,
  onClose,
}: {
  lightbox: { title: string; photos: string[]; index: number } | null;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(lightbox?.index ?? 0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    if (lightbox) setIdx(lightbox.index);
  }, [lightbox]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx((c) => (c - 1 + lightbox.photos.length) % lightbox.photos.length);
      if (e.key === 'ArrowRight') setIdx((c) => (c + 1) % lightbox.photos.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, onClose]);

  if (!lightbox) return null;
  const { title, photos } = lightbox;
  const hasMultiple = photos.length > 1;
  const prev = () => setIdx((c) => (c - 1 + photos.length) % photos.length);
  const next = () => setIdx((c) => (c + 1) % photos.length);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950/90 p-3 sm:p-6 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} photo gallery`}
    >
      {/* Top bar */}
      <div
        className="flex w-full max-w-5xl items-center justify-between gap-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="font-display text-base sm:text-lg font-bold">{title}</h3>
          {hasMultiple && (
            <p className="text-xs text-slate-300 font-mono">
              Photo {idx + 1} of {photos.length}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo viewer"
          className="tap flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white border border-white/15 transition hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main image stage */}
      <div
        className="relative my-auto flex w-full max-w-5xl flex-1 items-center justify-center overflow-hidden py-3"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchStartX === null || !hasMultiple) return;
          const delta = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
          if (delta > 45) prev();
          else if (delta < -45) next();
          setTouchStartX(null);
        }}
      >
        {hasMultiple && (
          <button
            type="button"
            onClick={prev}
            aria-label="Previous photo"
            className="tap absolute left-1 sm:left-3 z-10 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-slate-900/80 text-white border border-white/15 shadow-lg backdrop-blur-md transition hover:bg-[#155dfd]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <img
          src={photos[idx]}
          alt={`${title} photo ${idx + 1}`}
          className="max-h-[72vh] sm:max-h-[76vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
        />

        {hasMultiple && (
          <button
            type="button"
            onClick={next}
            aria-label="Next photo"
            className="tap absolute right-1 sm:right-3 z-10 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-slate-900/80 text-white border border-white/15 shadow-lg backdrop-blur-md transition hover:bg-[#155dfd]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Thumbnails bar */}
      {hasMultiple && (
        <div
          className="flex max-w-full items-center gap-2.5 overflow-x-auto pb-1 pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIdx(i)}
              className={cn(
                'tap relative h-14 w-20 sm:h-16 sm:w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                i === idx ? 'border-[#155dfd] ring-2 ring-[#155dfd]/40 scale-105' : 'border-white/20 opacity-60 hover:opacity-100'
              )}
            >
              <img src={src} alt={`${title} thumbnail ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ id, title, subtitle, children }: { id?: string; title: React.ReactNode; subtitle: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-8 scroll-mt-32 first:mt-0 sm:mt-10">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mb-4 text-sm text-slate-500">{subtitle}</p>
      {children}
    </section>
  );
}

function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  unit,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 p-1 shadow-sm" aria-label={label}>
      <button
        type="button"
        className="tap flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        aria-label={`Decrease ${label}`}
        title={unit ? `Decrease by 1 ${unit}` : `Decrease ${label}`}
      >
        <Minus className="h-4 w-4" />
      </button>

      <span className="min-w-16 px-2 text-center font-mono text-sm font-bold tabular-nums text-slate-800 whitespace-nowrap">
        {value} {unit ? `${unit}${value > 1 && !unit.endsWith('s') ? 's' : ''}` : ''}
      </span>

      <button
        type="button"
        className="tap flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label={`Increase ${label}`}
        title={unit ? `Increase by 1 ${unit}` : `Increase ${label}`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function useBook() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (v: { itemId: string; quantity: number }) => api<{ booking: Booking; invoice: Invoice }>('/bookings', { body: v }),
    onSuccess: ({ invoice }) => {
      toast.success('Booking created', 'Complete payment by bank transfer to confirm it.');
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
      navigate(`/app/finance?invoice=${invoice.id}`);
    },
    onError: (e) => toast.error('Booking failed', errorMessage(e)),
  });
}

function BookModal({ item, onClose }: { item: CatalogItem | null; onClose: () => void }) {
  const [qty, setQty] = useState(1);
  const book = useBook();
  if (!item) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;
  const max = item.unit === 'hour' ? 12 : item.unit === 'day' ? 30 : 12;
  const isAvailable = item.availableUnits === undefined || item.availableUnits > 0;
  return (
    <Modal open onClose={onClose} title={`Book ${item.name}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">{item.description}</p>
        {item.availableUnits !== undefined && (
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
            isAvailable ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', isAvailable ? 'bg-emerald-500' : 'bg-rose-500')} />
            {isAvailable ? `${item.availableUnits} of ${item.maxCapacity ?? 10} available` : 'Fully booked'}
          </span>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold block">Select duration:</span>
          <span className="text-xs text-blue-600 font-medium">
            (+1 {item.unit} per click)
          </span>
        </div>
        <Stepper value={qty} onChange={setQty} max={max} label={`${item.unit}s`} unit={item.unit} />
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-blue-500/10 px-4 py-3">
        <span className="text-sm">{naira(item.price)} × {qty} {item.unit}{qty > 1 ? 's' : ''}</span>
        <span className="font-display text-xl font-bold">{naira(item.price * qty)}</span>
      </div>
      <Button className="mt-5 w-full" disabled={!isAvailable} loading={book.isPending} onClick={() => book.mutate({ itemId: item.id, quantity: qty })}>
        {isAvailable ? 'Book & proceed to payment' : 'Currently fully booked'}
      </Button>
    </Modal>
  );
}

function CoWorkspace({
  desks,
  onOpenLightbox,
}: {
  desks: CatalogItem[];
  onOpenLightbox: (index: number) => void;
}) {
  const [mode, setMode] = useState<'hour' | 'day'>('hour');
  const [qty, setQty] = useState(2);
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const book = useBook();

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setSlideIdx((curr) => (curr + 1) % DESK_PHOTOS.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [paused]);

  const desk = desks.find((d) => d.unit === mode) ?? desks[0];
  if (!desk) return <Empty title="No desks available right now" />;
  const isAvailable = desk.availableUnits === undefined || desk.availableUnits > 0;

  return (
    <Card variant="bento" className="overflow-hidden p-0 sm:p-0">
      <div className="grid lg:grid-cols-12 gap-0">
        <div
          className="group relative lg:col-span-5 h-60 sm:h-68 lg:h-auto min-h-[240px] overflow-hidden bg-slate-900 cursor-pointer select-none"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onClick={() => onOpenLightbox(slideIdx)}
          role="button"
          tabIndex={0}
          aria-label="View Co-Workspace Area photos"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenLightbox(slideIdx);
            }
          }}
        >
          {DESK_PHOTOS.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`Co-Workspace Area ${i + 1}`}
              className={cn(
                'absolute inset-0 h-full w-full object-cover object-center transition-all duration-700 [@media(hover:hover)]:group-hover:scale-105',
                i === slideIdx ? 'opacity-100 z-[1]' : 'opacity-0 z-0 pointer-events-none'
              )}
              loading="lazy"
            />
          ))}

          {/* Top-right expand pill & slide counter */}
          <div className="absolute top-3 left-3 right-3 z-[3] flex items-center justify-between">
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {DESK_PHOTOS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setSlideIdx(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === slideIdx ? 'w-5 bg-[#155dfd]' : 'w-1.5 bg-white/60 hover:bg-white'
                  )}
                />
              ))}
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/75 backdrop-blur-md border border-white/15 px-2.5 py-0.5 text-[10px] font-medium text-white">
              <Expand className="h-3 w-3" />
              <span>{slideIdx + 1}/{DESK_PHOTOS.length} · Tap to view</span>
            </span>
          </div>

          {/* Prev / Next arrows */}
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              setSlideIdx((curr) => (curr - 1 + DESK_PHOTOS.length) % DESK_PHOTOS.length);
            }}
            className="tap absolute left-2.5 top-1/2 z-[3] -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur-md border border-white/15 transition hover:bg-slate-950 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              setSlideIdx((curr) => (curr + 1) % DESK_PHOTOS.length);
            }}
            className="tap absolute right-2.5 top-1/2 z-[3] -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur-md border border-white/15 transition hover:bg-slate-950 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute bottom-4 left-4 right-4 z-[3] flex flex-wrap gap-1.5 pointer-events-none">
            <span className="rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white">
              1 Gbps Fiber
            </span>
            <span className="rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white">
              24/7 Redundant Power
            </span>
            <span className="rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white">
              Ergonomic Seating
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5 p-4 sm:gap-6 sm:p-8 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full border border-slate-200 p-1 bg-slate-100/50" role="radiogroup" aria-label="Desk plan">
                {(['hour', 'day'] as const).filter((m) => desks.some((d) => d.unit === m)).map((m) => (
                  <button
                    key={m}
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => { setMode(m); setQty(m === 'hour' ? 2 : 1); }}
                    className={cn(
                      'tap rounded-full px-5 py-2 text-sm font-semibold transition',
                      mode === m ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {m === 'hour' ? 'Hourly rate' : 'Day pass'}
                  </button>
                ))}
              </div>

              {desk.availableUnits !== undefined && (
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                  isAvailable ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                )}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')} />
                  {isAvailable ? `${desk.availableUnits} of ${desk.maxCapacity ?? 10} desks open` : 'Fully booked'}
                </span>
              )}
            </div>

            <div className="mt-5 flex items-start gap-4">
              <span className="rounded-2xl bg-blue-50 text-blue-600 p-3 shrink-0">
                <Armchair className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display text-xl font-bold text-slate-900">{desk.name}</p>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">{desk.description}</p>
                <p className="mt-2 font-mono text-lg font-bold text-blue-600">
                  {naira(desk.price)} <span className="font-sans text-xs font-normal text-slate-400">/ {desk.unit}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Select duration</span>
              <Stepper
                value={qty}
                onChange={setQty}
                max={mode === 'hour' ? 12 : 30}
                label={`${mode}s`}
                unit={mode === 'hour' ? 'hr' : 'day'}
              />
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-5">
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-400 font-medium font-mono">
                  {naira(desk.price)} × {qty} {mode === 'hour' ? 'hr' : 'day'}{qty > 1 ? 's' : ''}
                </p>
                <p className="font-display text-2xl font-extrabold text-slate-900">
                  {naira(desk.price * qty)}
                </p>
              </div>

              <Button
                disabled={!isAvailable}
                loading={book.isPending}
                onClick={() => book.mutate({ itemId: desk.id, quantity: qty })}
                className="px-6 max-sm:flex-1"
              >
                {isAvailable ? 'Reserve desk' : 'Fully booked'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Set to true to display the Coming Soon status on the user end while preserving all underlying code.
const LOUNGE_COMING_SOON = true;

function LoungeComingSoonCover() {
  return (
    <Card className="relative overflow-hidden p-8 sm:p-12 text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-blue-500/5 pointer-events-none" />
      <div className="relative mx-auto max-w-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-500/20 to-blue-600/20 text-blue-600 shadow-inner">
          <UtensilsCrossed className="h-8 w-8" />
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700">
          <Clock className="h-3.5 w-3.5" />
          <span>Coming Soon · Kitchen Setup In Progress</span>
        </div>

        <h3 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Cafeteria & Desk-Side Refreshments
        </h3>
        <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600">
          Enjoy gourmet meals, snacks, and freshly brewed artisan coffee delivered straight to your hot desk, private office, or studio without leaving your workflow.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 text-left">
          <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm">
            <p className="font-semibold text-slate-900 text-sm">Desk-Side Delivery</p>
            <p className="mt-1 text-xs text-slate-500 leading-normal">Tagged to your desk number so you can stay in flow while food comes to you.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm">
            <p className="font-semibold text-slate-900 text-sm">Barista & Snacks</p>
            <p className="mt-1 text-xs text-slate-500 leading-normal">Espresso, healthy bites, cold brews, and fresh lunch specials every day.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm">
            <p className="font-semibold text-slate-900 text-sm">Cashless Billing</p>
            <p className="mt-1 text-xs text-slate-500 leading-normal">Seamless checkout via wallet, bank transfer, and automated hub invoicing.</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500 flex items-center justify-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-blue-600" />
          <span>The kitchen team is currently finalizing menu pricing and supplier prep. Ordering will unlock here automatically soon.</span>
        </div>
      </div>
    </Card>
  );
}

function Lounge({ menu }: { menu: CatalogItem[] }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customItem, setCustomItem] = useState('');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const orders = useQuery({ queryKey: ['lounge'], queryFn: () => api<LoungeOrder[]>('/lounge/orders') });

  const lines = menu.filter((m) => cart[m.id]).map((m) => ({ item: m, qty: cart[m.id] }));
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const setQty = (id: string, q: number) => setCart(({ [id]: _drop, ...rest }) => (q > 0 ? { ...rest, [id]: q } : rest));

  const submit = useMutation({
    mutationFn: () =>
      api<{ order: LoungeOrder; invoice: Invoice | null }>('/lounge/orders', {
        body: { items: lines.map((l) => ({ itemId: l.item.id, qty: l.qty })), customItem: customItem || undefined, notes: notes || undefined },
      }),
    onSuccess: ({ invoice }) => {
      setCart({});
      setCustomItem('');
      setNotes('');
      setConfirming(false);
      qc.invalidateQueries({ queryKey: ['lounge'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Order sent to the lounge', invoice ? 'Pay by transfer to start preparation.' : 'The counter will price your custom item.');
      if (invoice) navigate(`/app/finance?invoice=${invoice.id}`);
    },
    onError: (e) => toast.error('Order failed', errorMessage(e)),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="grid gap-3 sm:grid-cols-2">
        {menu.map((m) => (
          <Card key={m.id} className="flex items-center justify-between gap-3 p-4 sm:p-4">
            <div className="min-w-0">
              <p className="font-semibold">{m.name}</p>
              <p className="truncate text-xs text-slate-500">{m.description}</p>
              <p className="mt-1 text-sm font-semibold text-cyan-600">{naira(m.price)}</p>
            </div>
            {cart[m.id] ? (
              <Stepper value={cart[m.id]} onChange={(q) => setQty(m.id, q)} min={0} max={20} label={m.name} />
            ) : (
              <Button size="sm" variant="outline" onClick={() => setQty(m.id, 1)}><Plus className="h-4 w-4" /> Add</Button>
            )}
          </Card>
        ))}
      </div>

      <Card className="h-fit">
        <p className="flex items-center gap-2 font-display font-bold"><ShoppingBag className="h-5 w-5 text-cyan-500" /> Your order</p>
        <div className="mt-4 space-y-2 text-sm">
          {lines.length === 0 && !customItem && <p className="text-slate-500">Add items from the menu.</p>}
          {lines.map((l) => (
            <div key={l.item.id} className="flex justify-between"><span>{l.qty}× {l.item.name}</span><span>{naira(l.item.price * l.qty)}</span></div>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Custom item" hint="Not on the menu? Ask the counter — it's priced on pickup.">
            <input className="field" value={customItem} maxLength={120} onChange={(e) => setCustomItem(e.target.value)} placeholder="e.g. Jollof rice, no pepper" />
          </Field>
          <Field label="Notes for the kitchen">
            <input className="field" value={notes} maxLength={240} onChange={(e) => setNotes(e.target.value)} placeholder="Desk 14, extra ketchup…" />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-sm text-slate-500">Total</span>
          <span className="font-display text-xl font-bold">{naira(total)}</span>
        </div>
        <Button className="mt-4 w-full" disabled={lines.length === 0 && !customItem.trim()} onClick={() => setConfirming(true)}>
          <UtensilsCrossed className="h-4 w-4" /> Review order
        </Button>

        {!!orders.data?.length && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recent orders</p>
            <ul className="mt-2 space-y-2">
              {orders.data.slice(0, 4).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-slate-500">{formatDateTime(o.createdAt)} · {naira(o.total)}</span>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Confirm lounge order">
        <ul className="space-y-2 text-sm">
          {lines.map((l) => (
            <li key={l.item.id} className="flex justify-between"><span>{l.qty}× {l.item.name}</span><span>{naira(l.item.price * l.qty)}</span></li>
          ))}
          {customItem && <li className="flex justify-between text-slate-500"><span>1× {customItem} (custom)</span><span>priced at counter</span></li>}
        </ul>
        {notes && <p className="mt-3 rounded-2xl bg-slate-100 px-3 py-2 text-sm">Note: {notes}</p>}
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-blue-500/10 px-4 py-3">
          <span className="text-sm">Total due now</span>
          <span className="font-display text-xl font-bold">{naira(total)}</span>
        </div>
        <Button className="mt-5 w-full" loading={submit.isPending} onClick={() => submit.mutate()}>Submit order</Button>
      </Modal>
    </div>
  );
}

export default function Infra() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: () => api<CatalogItem[]>('/catalog') });
  const bookings = useQuery({ queryKey: ['bookings'], queryFn: () => api<Booking[]>('/bookings') });
  const finance = useQuery({ queryKey: ['finance'], queryFn: () => api<{ invoices: Invoice[] }>('/finance') });
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [lightbox, setLightbox] = useState<{ title: string; photos: string[]; index: number } | null>(null);
  const book = useBook();

  useSocketEvent('catalog:changed', () => {
    qc.invalidateQueries({ queryKey: ['catalog'] });
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api(`/bookings/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Booking cancelled');
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
    },
    onError: (e) => toast.error('Could not cancel', errorMessage(e)),
  });

  const by = useMemo(() => {
    const groups: Record<string, CatalogItem[]> = {};
    for (const item of catalog.data ?? []) (groups[item.category] ??= []).push(item);
    return groups;
  }, [catalog.data]);

  if (catalog.isLoading) return <Loading />;
  const invoiceFor = (bookingId: string) => finance.data?.invoices.find((i) => i.refId === bookingId && i.status === 'PENDING');
  const openBookings = (bookings.data ?? []).filter((b) => ['PENDING_PAYMENT', 'CONFIRMED', 'ACTIVE'].includes(b.status));

  return (
    <>
      <PageHeader eyebrow="Infra" title="Infrastructure" subtitle="Book workspace, facilities and hardware — lounge orders and cafeteria coming soon." />

      {/* Jump links: this page is long, so let people hop between sections */}
      <nav aria-label="Sections" className="no-scrollbar sticky top-[57px] z-10 -mx-4 mb-6 flex gap-2 overflow-x-auto bg-slate-50/85 px-4 py-2.5 backdrop-blur-xl sm:top-[65px] sm:-mx-6 sm:px-6 lg:top-[65px]">
        {[
          ['desks', 'Desks'],
          ['facilities', 'Facilities'],
          ['programs', 'Programs'],
          ['hardware', 'Hardware'],
          ['lounge', 'Lounge'],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="tap shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-500/50 hover:text-blue-600"
          >
            {label}
          </a>
        ))}
      </nav>

      {openBookings.length > 0 && (
        <Card className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">My open bookings</p>
          <ul className="divide-y divide-slate-200">
            {openBookings.map((b) => {
              const invoice = invoiceFor(b.id);
              return (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{b.item.name} · {b.quantity} {b.item.unit}{b.quantity > 1 ? 's' : ''}</p>
                    <p className="text-xs text-slate-500">{naira(b.amount)} · booked {formatDateTime(b.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={b.status} />
                    {invoice && <Button size="sm" onClick={() => navigate(`/app/finance?invoice=${invoice.id}`)}>Pay</Button>}
                    {b.status === 'PENDING_PAYMENT' && invoice && (
                      <Button size="sm" variant="ghost" loading={cancel.isPending && cancel.variables === b.id} onClick={() => cancel.mutate(b.id)}>Cancel</Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Section id="desks" title="Co-Workspace Area" subtitle="Flexible desks with fibre, power backup and lounge access.">
        <CoWorkspace
          desks={by.DESK ?? []}
          onOpenLightbox={(index) => setLightbox({ title: 'Co-Workspace Area', photos: DESK_PHOTOS, index })}
        />
      </Section>

      <Section id="facilities" title="Private Facilities" subtitle="Bookable by the hour. Paid bookings can be checked in from your Overview.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(by.FACILITY ?? []).map((f) => {
            const Icon = FACILITY_ICONS[f.name] ?? Building2;
            const isFull = f.availableUnits !== undefined && f.availableUnits <= 0;
            const photos = FACILITY_GALLERIES[f.name] ?? [FACILITY_PHOTOS[f.name] ?? DESK_PHOTO];
            return (
              <Card key={f.id} variant="bento" className="flex flex-col overflow-hidden p-0 sm:p-0 group">
                <FacilityCardMedia
                  facility={f}
                  Icon={Icon}
                  isFull={isFull}
                  photos={photos}
                  onOpenLightbox={(index) => setLightbox({ title: f.name, photos, index })}
                />

                <div className="flex flex-1 flex-col p-5">
                  <p className="font-display text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {f.name}
                  </p>
                  <p className="mt-1 flex-1 text-xs text-slate-500 leading-relaxed">
                    {f.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                    <p className="font-mono text-base font-bold text-slate-900">
                      {naira(f.price)} <span className="font-sans text-xs font-normal text-slate-400">/{f.unit}</span>
                    </p>
                    <Button
                      size="sm"
                      disabled={isFull}
                      onClick={() => setSelected(f)}
                    >
                      {isFull ? 'Fully booked' : 'Book space'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section id="programs" title="Hub Programs" subtitle="Monthly program subscriptions for founders and builders.">
        <div className="grid gap-4 md:grid-cols-2">
          {(by.PROGRAM ?? []).map((p) => (
            <Card key={p.id} variant="bento" className="relative overflow-hidden group">
              <Rocket className="absolute -right-3 -top-3 h-28 w-28 text-blue-500/10 pointer-events-none transition group-hover:scale-110 group-hover:text-blue-500/20" />
              <Badge tone="cyan">Incubation & Residency</Badge>
              <p className="mt-3 font-display text-xl font-bold text-slate-900">{p.name}</p>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">{p.description}</p>
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
                <p className="font-display text-2xl font-extrabold text-slate-900">
                  {naira(p.price)}<span className="font-sans text-xs font-normal text-slate-400"> /month</span>
                </p>
                <Button
                  loading={book.isPending && book.variables?.itemId === p.id}
                  onClick={() => book.mutate({ itemId: p.id, quantity: 1 })}
                >
                  Join Residency
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="hardware" title="Hardware Rentals" subtitle="Rent high-spec workstations and laptops for your projects.">
        <Card variant="bento" className="p-0 sm:p-0 overflow-hidden">
          <ul className="divide-y divide-slate-200">
            {(by.HARDWARE ?? []).map((h) => {
              const isFull = h.availableUnits !== undefined && h.availableUnits <= 0;
              return (
                <li key={h.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-4 transition hover:bg-slate-50">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <span className="rounded-2xl bg-blue-500/10 p-3 text-blue-600 shrink-0">
                      <Laptop className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{h.name}</p>
                        {h.availableUnits !== undefined && (
                          <span className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shrink-0',
                            !isFull ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', !isFull ? 'bg-emerald-500' : 'bg-rose-500')} />
                            {!isFull ? `${h.availableUnits} of ${h.maxCapacity ?? 10} units ready` : 'All rented'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{h.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-[52px] sm:pl-0 pt-1 sm:pt-0">
                    <p className="font-mono font-bold text-slate-900 whitespace-nowrap">
                      {naira(h.price)}<span className="font-sans text-xs font-normal text-slate-400">/{h.unit}</span>
                    </p>
                    <Button
                      size="sm"
                      variant={isFull ? 'outline' : 'primary'}
                      disabled={isFull}
                      onClick={() => setSelected(h)}
                      className="shrink-0"
                    >
                      {isFull ? 'Unavailable' : 'Rent device'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </Section>

      <Section
        id="lounge"
        title={
          <span className="inline-flex items-center gap-2">
            <span>Lounge Orders</span>
            <Badge tone="blue">Coming Soon</Badge>
          </span>
        }
        subtitle="Cafeteria and desk-side refreshment ordering is coming soon to the hub."
      >
        {LOUNGE_COMING_SOON ? <LoungeComingSoonCover /> : <Lounge menu={by.LOUNGE ?? []} />}
      </Section>

      <BookModal key={selected?.id} item={selected} onClose={() => setSelected(null)} />
      <FacilityLightboxModal lightbox={lightbox} onClose={() => setLightbox(null)} />
    </>
  );
}
