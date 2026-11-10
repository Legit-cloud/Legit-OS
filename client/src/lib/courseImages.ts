/**
 * Real, authentic, unwatermarked photography mapped to Academy courses.
 */
export function getCourseImage(slug?: string, title?: string): string {
  const s = (slug || '').toLowerCase();
  const t = (title || '').toLowerCase();

  // Full-Stack / Web Development / Cloud
  if (s.includes('full-stack') || s.includes('web') || t.includes('full-stack') || t.includes('web') || t.includes('software')) {
    return 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80';
  }

  // Cybersecurity / Ethical Hacking / SecOps
  if (s.includes('cyber') || s.includes('sec') || t.includes('cyber') || t.includes('security') || t.includes('hacking')) {
    return 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80';
  }

  // Video Editing / Creative Media
  if (s.includes('video') || t.includes('video') || t.includes('editing') || t.includes('creative')) {
    return 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80';
  }

  // Product Leadership / UI/UX Design / Project Management
  if (
    s.includes('project') || s.includes('product') || s.includes('design') || s.includes('ui') ||
    t.includes('project') || t.includes('product') || t.includes('design') || t.includes('management')
  ) {
    return 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80';
  }

  // Python for Beginners / Foundations
  if (s.includes('begin') || t.includes('begin')) {
    return 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80';
  }

  // Python Mastery / Data Science / AI/ML
  if (s.includes('python') || s.includes('data') || s.includes('ai') || t.includes('python') || t.includes('data') || t.includes('ai') || t.includes('machine')) {
    return 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80';
  }

  // Default clean software engineering photo
  return 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80';
}
